'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, Info } from 'lucide-react'

interface GmailSearchTabProps {
  orgId: string
  setupId: string
}

async function getSetting(orgId: string, settingKey: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_value')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .eq('setting_key', settingKey)
    .maybeSingle()

  if (error) throw error
  return data?.setting_value ?? ''
}

async function upsertSetting(orgId: string, setupId: string, settingKey: string, value: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { org_id: orgId, user_id: user.id, setup_id: setupId, setting_key: settingKey, setting_value: value },
      { onConflict: 'org_id,user_id,setting_key' },
    )

  if (error) throw error
}

export function GmailSearchTab({ orgId, setupId }: GmailSearchTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [gmailQuery, setGmailQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useQuery({
    queryKey: ['setting', orgId, 'gmail_query'],
    queryFn: () => getSetting(orgId, 'gmail_query'),
    onSuccess: (val: string) => setGmailQuery(val),
  } as Parameters<typeof useQuery>[0])

  async function handleSave() {
    setSaving(true)
    try {
      await upsertSetting(orgId, setupId, 'gmail_query', gmailQuery)
      qc.invalidateQueries({ queryKey: ['setting', orgId, 'gmail_query'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg flex flex-col gap-6">
      <div>
        <h3 className="font-sans font-semibold text-fg-primary mb-1">{t('config.gmail_search')}</h3>
        <p className="text-small text-fg-secondary">
          Το ερώτημα αναζήτησης Gmail για εύρεση τιμολογίων και συνημμένων.
        </p>
      </div>

      <div>
        <label className="block text-small text-fg-secondary mb-1.5">{t('config.gmail_query')}</label>
        <Input
          value={gmailQuery}
          onChange={(e) => setGmailQuery(e.target.value)}
          placeholder='has:attachment filename:*.pdf subject:"τιμολόγιο"'
          className="font-mono"
        />
        <div className="mt-2 flex items-start gap-1.5 text-[12px] text-fg-tertiary">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          <span>Χρησιμοποιεί σύνταξη Gmail search operators. Παράδειγμα: <code className="font-mono bg-bg-alt px-1 rounded">has:attachment subject:invoice</code></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={14} className="mr-1.5" />
          {saving ? t('common.loading') : saved ? t('common.success') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}
