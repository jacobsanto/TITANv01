'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { DateRangePicker, defaultRange, toCsv, downloadCsv } from '@/components/reports/DateRangePicker'
import { Loader2, Download } from 'lucide-react'

type EntityType = 'invoices' | 'bank_docs' | 'skipped_docs'
type ExportFormat = 'csv' | 'json'

const ENTITY_COLUMNS: Record<EntityType, string[]> = {
  invoices: ['id', 'invoice_number', 'mark_number', 'issuer', 'recipient', 'document_type', 'net_amount', 'vat_amount', 'withheld_tax', 'total_amount', 'payment_method', 'status', 'confidence', 'filing_path', 'drive_url', 'created_at'],
  bank_docs: ['id', 'description', 'amount', 'tx_type', 'invoice_id', 'status', 'created_at'],
  skipped_docs: ['id', 'original_filename', 'reason', 'drive_url', 'created_at'],
}

export function ExportView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const [entityType, setEntityType] = useState<EntityType>('invoices')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [range, setRange] = useState(defaultRange)
  const [exporting, setExporting] = useState(false)

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 size={32} className="animate-spin text-fg-tertiary" /></div>
  if (error || !orgId || !setupId) return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{error ?? t('common.error')}</div>

  async function handleExport() {
    setExporting(true)
    try {
      const supabase = createClient()
      const columns = ENTITY_COLUMNS[entityType].join(',')
      const { data, error: qErr } = await supabase
        .from(entityType)
        .select(columns)
        .eq('org_id', orgId!)
        .eq('setup_id', setupId!)
        .gte('created_at', range.from)
        .lte('created_at', range.to + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (qErr) throw qErr

      const rows = (data ?? []) as unknown as Record<string, unknown>[]
      const filename = `${entityType}-${range.from}-${range.to}`

      if (format === 'csv') {
        downloadCsv(toCsv(rows), `${filename}.csv`)
      } else {
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  const ENTITY_LABELS: Record<EntityType, string> = {
    invoices: t('dashboard.invoices'),
    bank_docs: t('dashboard.bank_transactions'),
    skipped_docs: t('dashboard.skipped_docs'),
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('common.export')}</h1>
      </div>

      <div className="p-6 max-w-lg">
        <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('common.type')}</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="w-full h-10 px-3 rounded-lg border border-border text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {(Object.keys(ENTITY_LABELS) as EntityType[]).map((k) => (
                <option key={k} value={k}>{ENTITY_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('common.type')} Format</label>
            <div className="flex gap-2">
              {(['csv', 'json'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 h-9 rounded-lg border text-small font-mono font-medium transition-colors ${format === f ? 'border-primary bg-primary/8 text-primary' : 'border-border text-fg-tertiary hover:text-fg-secondary'}`}
                >
                  .{f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('reports.period')}</label>
            <DateRangePicker
              from={range.from}
              to={range.to}
              onFromChange={(v) => setRange(r => ({ ...r, from: v }))}
              onToChange={(v) => setRange(r => ({ ...r, to: v }))}
            />
          </div>

          <div className="flex flex-col gap-2 text-[12px] text-fg-tertiary bg-bg-alt rounded-lg px-3 py-2.5">
            <p className="font-sans font-medium text-fg-secondary">Columns:</p>
            <p className="font-mono leading-relaxed">{ENTITY_COLUMNS[entityType].join(', ')}</p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <Loader2 size={18} className="mr-2 animate-spin" />
              : <Download size={18} className="mr-2" />}
            {exporting ? t('common.loading') : `${t('common.export')} .${format}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
