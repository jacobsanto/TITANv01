'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { CompanyFolderWizard } from '../CompanyFolderWizard'
import { Plus, FolderOpen, Pencil } from 'lucide-react'

interface CompaniesTabProps {
  orgId: string
  setupId: string
}

interface Company {
  id: string
  name: string
  afm: string | null
  drive_folder_id: string | null
}

interface FormState {
  name: string
  afm: string
  drive_folder_id: string
}

export function CompaniesTab({ orgId, setupId }: CompaniesTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<FormState>({ name: '', afm: '', drive_folder_id: '' })
  const [saving, setSaving] = useState(false)
  const [folderWizard, setFolderWizard] = useState<{ company: Company } | null>(null)

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('id,name,afm,drive_folder_id')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('name')
      if (error) throw error
      return (data as Company[]) ?? []
    },
    staleTime: 60_000,
  })

  async function handleAdd() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('companies').insert({
        org_id: orgId,
        setup_id: setupId,
        name: form.name,
        afm: form.afm || null,
        drive_folder_id: form.drive_folder_id || null,
      })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['companies', orgId, setupId] })
      setAddOpen(false)
      setForm({ name: '', afm: '', drive_folder_id: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          {t('common.add')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-alt" />
            ))
          : !companies?.length
          ? (
              <div className="col-span-3 py-12 text-center text-fg-tertiary text-small">{t('common.empty_state')}</div>
            )
          : companies.map((company) => (
              <div key={company.id} className="bg-bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans font-semibold text-fg-primary text-body">{company.name}</p>
                    {company.afm && (
                      <p className="font-mono text-[12px] text-fg-tertiary mt-0.5">{t('config.afm')}: {company.afm}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setFolderWizard({ company })}
                    className="p-1.5 rounded-lg text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors flex-shrink-0"
                    title="Αλλαγή φακέλου"
                  >
                    <FolderOpen size={15} />
                  </button>
                </div>
                {company.drive_folder_id && (
                  <p className="font-mono text-[11px] text-fg-tertiary truncate">{company.drive_folder_id}</p>
                )}
              </div>
            ))}
      </div>

      {/* Add company dialog */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('common.add') + ' ' + t('common.company')} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('common.name')} *</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.afm')}</label>
            <Input value={form.afm} onChange={(e) => setForm((f) => ({ ...f, afm: e.target.value }))} className="font-mono" mono />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('drive.folder_id')}</label>
            <Input value={form.drive_folder_id} onChange={(e) => setForm((f) => ({ ...f, drive_folder_id: e.target.value }))} className="font-mono" placeholder="Google Drive Folder ID" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!form.name || saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {folderWizard && (
        <CompanyFolderWizard
          open={!!folderWizard}
          onClose={() => setFolderWizard(null)}
          orgId={orgId}
          setupId={setupId}
          companyId={folderWizard.company.id}
          companyName={folderWizard.company.name}
          currentFolderId={folderWizard.company.drive_folder_id}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['companies', orgId, setupId] })
            setFolderWizard(null)
          }}
        />
      )}
    </div>
  )
}
