'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Save, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface GoogleApisTabProps {
  orgId: string
  setupId: string
}

const API_SETTING_KEYS = ['azure_endpoint', 'azure_key', 'gemini_key'] as const
type ApiKey = (typeof API_SETTING_KEYS)[number]

async function fetchApiSettings(orgId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data, error } = await supabase
    .from('user_settings')
    .select('setting_key,setting_value')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .in('setting_key', API_SETTING_KEYS)

  if (error) throw error
  const map: Record<ApiKey, string> = { azure_endpoint: '', azure_key: '', gemini_key: '' }
  for (const row of data ?? []) {
    map[row.setting_key as ApiKey] = row.setting_value ?? ''
  }
  return map
}

type VerifyResult = {
  google_drive: boolean
  gmail: boolean
  sheets: boolean
  azure_ocr: boolean
  gemini: boolean
} | null

export function GoogleApisTab({ orgId, setupId }: GoogleApisTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<ApiKey, string>>({ azure_endpoint: '', azure_key: '', gemini_key: '' })
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null)

  useQuery({
    queryKey: ['api_settings', orgId],
    queryFn: () => fetchApiSettings(orgId),
    onSuccess: (data: Record<ApiKey, string>) => setValues(data),
  } as Parameters<typeof useQuery>[0])

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated')

      const rows = API_SETTING_KEYS.map((key) => ({
        org_id: orgId,
        user_id: user.id,
        setup_id: setupId,
        setting_key: key,
        setting_value: values[key],
      }))

      const { error } = await supabase
        .from('user_settings')
        .upsert(rows, { onConflict: 'org_id,user_id,setting_key' })

      if (error) throw error
      qc.invalidateQueries({ queryKey: ['api_settings', orgId] })
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const result = await callEdge<VerifyResult>('verify-google-apis', { org_id: orgId, setup_id: setupId })
      setVerifyResult(result)
    } finally {
      setVerifying(false)
    }
  }

  function ApiStatus({ ok }: { ok: boolean }) {
    return ok
      ? <CheckCircle2 size={15} className="text-success" />
      : <XCircle size={15} className="text-error" />
  }

  return (
    <div className="max-w-lg flex flex-col gap-6">
      <div>
        <h3 className="font-sans font-semibold text-fg-primary mb-1">{t('config.google_apis')}</h3>
        <p className="text-small text-fg-secondary">Κλειδιά API για OCR και AI extraction.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-small text-fg-secondary mb-1.5">{t('config.azure_endpoint')}</label>
          <Input
            value={values.azure_endpoint}
            onChange={(e) => setValues((v) => ({ ...v, azure_endpoint: e.target.value }))}
            placeholder="https://your-resource.cognitiveservices.azure.com/"
            className="font-mono"
          />
        </div>
        <div>
          <label className="block text-small text-fg-secondary mb-1.5">{t('config.azure_key')}</label>
          <Input
            type="password"
            value={values.azure_key}
            onChange={(e) => setValues((v) => ({ ...v, azure_key: e.target.value }))}
            placeholder="Azure Cognitive Services API Key"
            className="font-mono"
          />
        </div>
        <div>
          <label className="block text-small text-fg-secondary mb-1.5">{t('config.gemini_key')}</label>
          <Input
            type="password"
            value={values.gemini_key}
            onChange={(e) => setValues((v) => ({ ...v, gemini_key: e.target.value }))}
            placeholder="Google Gemini API Key"
            className="font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />
          {saving ? t('common.loading') : t('common.save')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleVerify} disabled={verifying}>
          {verifying ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
          {verifying ? t('common.loading') : t('config.verify_apis')}
        </Button>
      </div>

      {verifyResult && (
        <div className="rounded-xl border border-border bg-bg-alt p-4 flex flex-col gap-2">
          {(
            [
              ['Google Drive', verifyResult.google_drive],
              ['Gmail', verifyResult.gmail],
              ['Google Sheets', verifyResult.sheets],
              ['Azure OCR', verifyResult.azure_ocr],
              ['Gemini AI', verifyResult.gemini],
            ] as [string, boolean][]
          ).map(([name, ok]) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-small text-fg-primary">{name}</span>
              <div className="flex items-center gap-1.5">
                <ApiStatus ok={ok} />
                <Badge variant={ok ? 'success' : 'error'}>{ok ? 'OK' : 'Error'}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
