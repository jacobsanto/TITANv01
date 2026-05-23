'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChangeImpactWizard } from '../ChangeImpactWizard'
import { Save, FolderOpen, AlertTriangle } from 'lucide-react'

interface GlobalSettingsTabProps {
  orgId: string
  setupId: string
}

type FolderKey = 'root_folder_id' | 'invoice_input_folder_id' | 'bank_input_folder_id'
type NonStructuralKey = 'duplicates_folder_id' | 'trash_folder_id' | 'sheet_id'

const STRUCTURAL_KEYS: FolderKey[] = ['root_folder_id', 'invoice_input_folder_id', 'bank_input_folder_id']
const NON_STRUCTURAL_KEYS: NonStructuralKey[] = ['duplicates_folder_id', 'trash_folder_id', 'sheet_id']
const ALL_KEYS = [...STRUCTURAL_KEYS, ...NON_STRUCTURAL_KEYS]

type Settings = Record<string, string>

async function fetchSettings(orgId: string): Promise<Settings> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_key,setting_value')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .in('setting_key', ALL_KEYS)

  if (error) throw error
  const map: Settings = {}
  for (const key of ALL_KEYS) map[key] = ''
  for (const row of data ?? []) map[row.setting_key] = row.setting_value ?? ''
  return map
}

export function GlobalSettingsTab({ orgId, setupId }: GlobalSettingsTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [values, setValues] = useState<Settings>({})
  const [pending, setPending] = useState<{ key: FolderKey; newValue: string } | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['global_settings', orgId],
    queryFn: () => fetchSettings(orgId),
  })

  useEffect(() => {
    if (settings) setValues(settings)
  }, [settings])

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function openStructuralWizard(key: FolderKey) {
    setPending({ key, newValue: values[key] })
    setWizardOpen(true)
  }

  async function upsertSettings(keys: string[]) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthenticated')

    const rows = keys.map((key) => ({
      org_id: orgId,
      user_id: user.id,
      setup_id: setupId,
      setting_key: key,
      setting_value: values[key] ?? '',
    }))

    const { error } = await supabase
      .from('user_settings')
      .upsert(rows, { onConflict: 'org_id,user_id,setting_key' })

    if (error) throw error
  }

  async function handleSaveNonStructural() {
    setSaving(true)
    try {
      await upsertSettings(NON_STRUCTURAL_KEYS)
      qc.invalidateQueries({ queryKey: ['global_settings', orgId] })
    } finally {
      setSaving(false)
    }
  }

  const folderLabels: Record<FolderKey, string> = {
    root_folder_id: t('config.root_folder'),
    invoice_input_folder_id: t('config.invoice_input_folder'),
    bank_input_folder_id: t('config.bank_input_folder'),
  }

  const nonStructuralLabels: Record<NonStructuralKey, string> = {
    duplicates_folder_id: t('config.duplicates_folder'),
    trash_folder_id: t('config.trash_folder'),
    sheet_id: t('config.sheet_id'),
  }

  return (
    <div className="max-w-lg flex flex-col gap-8">
      {/* Structural folders — guarded by ChangeImpactWizard */}
      <section className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h3 className="font-sans font-semibold text-fg-primary mb-0.5">{t('config.root_folder')}</h3>
            <p className="text-small text-fg-secondary">Αλλαγές σε αυτούς τους φακέλους επηρεάζουν όλα τα αρχειοθετημένα έγγραφα.</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-warning bg-warning/10 px-2 py-1 rounded-md flex-shrink-0">
            <AlertTriangle size={11} />
            Structural
          </div>
        </div>

        {STRUCTURAL_KEYS.map((key) => (
          <div key={key}>
            <label className="block text-small text-fg-secondary mb-1.5">{folderLabels[key]}</label>
            <div className="flex items-center gap-2">
              <Input
                value={values[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
                placeholder="Google Drive Folder ID"
                className="font-mono flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => openStructuralWizard(key)}
                className="flex-shrink-0"
                title={t('common.apply')}
              >
                <FolderOpen size={14} />
              </Button>
            </div>
          </div>
        ))}
      </section>

      {/* Non-structural settings — direct save */}
      <section className="flex flex-col gap-4">
        <h3 className="font-sans font-semibold text-fg-primary">{t('config.global_settings')}</h3>
        {NON_STRUCTURAL_KEYS.map((key) => (
          <div key={key}>
            <label className="block text-small text-fg-secondary mb-1.5">{nonStructuralLabels[key]}</label>
            <Input
              value={values[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder={key.includes('folder') ? 'Google Drive Folder ID' : 'Google Sheet ID'}
              className="font-mono"
            />
          </div>
        ))}
        <div>
          <Button variant="primary" size="sm" onClick={handleSaveNonStructural} disabled={saving}>
            <Save size={14} className="mr-1.5" />
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </section>

      {pending && (
        <ChangeImpactWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setPending(null) }}
          title={`${t('config.change_impact.title')}: ${folderLabels[pending.key]}`}
          description={t('config.change_impact.warning')}
          previewFn={() =>
            callEdge('preview-setup-change', {
              org_id: orgId,
              setup_id: setupId,
              change_type: 'folder_change',
              field: pending.key,
              new_value: pending.newValue,
            }) as Promise<import('../ChangeImpactWizard').ChangeImpact>
          }
          applyFn={async () => {
            await callEdge('apply-setup-change', {
              org_id: orgId,
              setup_id: setupId,
              change_type: 'folder_change',
              field: pending.key,
              new_value: pending.newValue,
            })
            await upsertSettings([pending.key])
          }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['global_settings', orgId] })
            setPending(null)
          }}
        />
      )}
    </div>
  )
}
