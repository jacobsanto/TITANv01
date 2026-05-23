'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { DateRangePicker, defaultRange, toCsv, downloadCsv } from '../DateRangePicker'
import { Download, FileSpreadsheet } from 'lucide-react'

interface AccountantExportTabProps {
  orgId: string
  setupId: string
}

interface ExportRow {
  date: string
  invoice_number: string
  mark_number: string
  issuer: string
  recipient: string
  company: string
  document_type: string
  net_amount: number
  vat_amount: number
  withheld_tax: number
  total_amount: number
  payment_method: string
  filing_path: string
}

export function AccountantExportTab({ orgId, setupId }: AccountantExportTabProps) {
  const t = useT()
  const [range, setRange] = useState(defaultRange)
  const [generate, setGenerate] = useState(false)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['accountant_export', orgId, setupId, range.from, range.to],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number,mark_number,issuer,recipient,document_type,net_amount,vat_amount,withheld_tax,total_amount,payment_method,filing_path,created_at,companies(name)')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('status', 'filed')
        .gte('created_at', range.from)
        .lte('created_at', range.to + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map((inv: Record<string, unknown>) => ({
        date: new Date(inv.created_at as string).toLocaleDateString('el-GR'),
        invoice_number: (inv.invoice_number as string) ?? '',
        mark_number: (inv.mark_number as string) ?? '',
        issuer: (inv.issuer as string) ?? '',
        recipient: (inv.recipient as string) ?? '',
        company: (inv.companies as unknown as { name: string } | null)?.name ?? '',
        document_type: (inv.document_type as string) ?? '',
        net_amount: (inv.net_amount as number) ?? 0,
        vat_amount: (inv.vat_amount as number) ?? 0,
        withheld_tax: (inv.withheld_tax as number) ?? 0,
        total_amount: (inv.total_amount as number) ?? 0,
        payment_method: (inv.payment_method as string) ?? '',
        filing_path: (inv.filing_path as string) ?? '',
      })) as ExportRow[]
    },
    enabled: generate,
    staleTime: 60_000,
  })

  function handleDownload() {
    if (!rows?.length) return
    const csvRows = rows.map(r => ({
      [t('common.date')]: r.date,
      [t('dashboard.invoice_number')]: r.invoice_number,
      [t('dashboard.mark_number')]: r.mark_number,
      [t('dashboard.issuer')]: r.issuer,
      [t('dashboard.recipient')]: r.recipient,
      [t('common.company')]: r.company,
      [t('dashboard.document_type')]: r.document_type,
      [t('reports.net_amount')]: r.net_amount.toFixed(2),
      [t('dashboard.vat_amount')]: r.vat_amount.toFixed(2),
      [t('dashboard.withheld_tax')]: r.withheld_tax.toFixed(2),
      [t('dashboard.total_amount')]: r.total_amount.toFixed(2),
      [t('dashboard.payment_method')]: r.payment_method,
      [t('dashboard.filing_path')]: r.filing_path,
    }))
    downloadCsv(toCsv(csvRows), `accountant-export-${range.from}-${range.to}.csv`)
  }

  const fmt = (n: number) => n.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <div>
        <h3 className="font-sans font-semibold text-fg-primary mb-1">{t('reports.accountant_export')}</h3>
        <p className="text-small text-fg-secondary">Πλήρης εξαγωγή επεξεργασμένων τιμολογίων για λογιστική χρήση (CSV).</p>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <DateRangePicker from={range.from} to={range.to} onFromChange={(v) => setRange(r => ({ ...r, from: v }))} onToChange={(v) => setRange(r => ({ ...r, to: v }))} />
        <Button variant="primary" size="sm" onClick={() => setGenerate(true)} className="mb-0.5">
          <FileSpreadsheet size={14} className="mr-1.5" />
          {t('reports.generate')}
        </Button>
        {rows?.length ? (
          <Button variant="outline" size="sm" onClick={handleDownload} className="mb-0.5">
            <Download size={14} className="mr-1.5" />
            {t('reports.download_csv')} ({rows.length})
          </Button>
        ) : null}
      </div>

      {generate && (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-small whitespace-nowrap">
              <thead>
                <tr className="bg-bg-alt border-b border-border">
                  {[t('common.date'), t('dashboard.invoice_number'), t('dashboard.mark_number'), t('dashboard.issuer'), t('common.company'), t('dashboard.document_type'), t('reports.net_amount'), t('dashboard.vat_amount'), t('dashboard.withheld_tax'), t('dashboard.total_amount')].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 10 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-20" /></td>)}</tr>)
                  : !rows?.length
                  ? <tr><td colSpan={10} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
                  : rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="hover:bg-bg-alt/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-fg-tertiary">{row.date}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-fg-secondary">{row.invoice_number || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-fg-secondary">{row.mark_number || '—'}</td>
                        <td className="px-4 py-2.5 text-fg-primary max-w-[140px] truncate">{row.issuer || '—'}</td>
                        <td className="px-4 py-2.5 text-fg-secondary max-w-[100px] truncate">{row.company}</td>
                        <td className="px-4 py-2.5 text-fg-secondary text-[12px]">{row.document_type || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-fg-primary text-right">{fmt(row.net_amount)}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-fg-primary text-right">{fmt(row.vat_amount)}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-error text-right">{row.withheld_tax > 0 ? fmt(row.withheld_tax) : '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-fg-primary text-right">{fmt(row.total_amount)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {(rows?.length ?? 0) > 100 && (
            <div className="px-4 py-3 border-t border-border text-[12px] text-fg-tertiary text-center">
              Εμφανίζονται 100 από {rows!.length} γραμμές. Κατεβάστε CSV για πλήρη δεδομένα.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
