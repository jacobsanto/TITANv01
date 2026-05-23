'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { DateRangePicker, defaultRange, toCsv, downloadCsv } from '../DateRangePicker'
import { Download } from 'lucide-react'

interface WithholdingTabProps {
  orgId: string
  setupId: string
}

interface WithholdingRow {
  company_name: string
  issuer: string
  invoice_number: string
  total_amount: number
  withheld_tax: number
  created_at: string
}

export function WithholdingTab({ orgId, setupId }: WithholdingTabProps) {
  const t = useT()
  const [range, setRange] = useState(defaultRange)
  const [generate, setGenerate] = useState(false)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['withholding_report', orgId, setupId, range.from, range.to],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number,issuer,total_amount,withheld_tax,created_at,companies(name)')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('status', 'filed')
        .gt('withheld_tax', 0)
        .gte('created_at', range.from)
        .lte('created_at', range.to + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map((inv: Record<string, unknown>) => ({
        company_name: (inv.companies as unknown as { name: string } | null)?.name ?? 'Unknown',
        issuer: (inv.issuer as string) ?? '—',
        invoice_number: (inv.invoice_number as string) ?? '—',
        total_amount: (inv.total_amount as number) ?? 0,
        withheld_tax: (inv.withheld_tax as number) ?? 0,
        created_at: inv.created_at as string,
      })) as WithholdingRow[]
    },
    enabled: generate,
    staleTime: 60_000,
  })

  const totalWithheld = rows?.reduce((s, r) => s + r.withheld_tax, 0) ?? 0

  function fmt(n: number) {
    return n.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
  }

  function handleDownload() {
    if (!rows?.length) return
    downloadCsv(toCsv(rows.map(r => ({
      [t('common.company')]: r.company_name,
      [t('dashboard.issuer')]: r.issuer,
      [t('dashboard.invoice_number')]: r.invoice_number,
      [t('dashboard.total_amount')]: r.total_amount.toFixed(2),
      [t('dashboard.withheld_tax')]: r.withheld_tax.toFixed(2),
      [t('common.date')]: new Date(r.created_at).toLocaleDateString('el-GR'),
    }))), `withholding-${range.from}-${range.to}.csv`)
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div className="flex items-end gap-4 flex-wrap">
        <DateRangePicker from={range.from} to={range.to} onFromChange={(v) => setRange(r => ({ ...r, from: v }))} onToChange={(v) => setRange(r => ({ ...r, to: v }))} />
        <Button variant="primary" size="sm" onClick={() => setGenerate(true)} className="mb-0.5">{t('reports.generate')}</Button>
        {rows?.length ? <Button variant="outline" size="sm" onClick={handleDownload} className="mb-0.5"><Download size={14} className="mr-1.5" />{t('reports.download_csv')}</Button> : null}
      </div>

      {generate && (
        <>
          {totalWithheld > 0 && (
            <div className="bg-info/5 border border-info/20 rounded-xl px-5 py-4 flex items-center justify-between">
              <span className="text-small text-fg-secondary">{t('reports.withholding')} ({rows?.length ?? 0} invoices)</span>
              <span className="font-sans font-bold text-fg-primary text-[20px]">{fmt(totalWithheld)}</span>
            </div>
          )}
          <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
            <table className="w-full text-small">
              <thead>
                <tr className="bg-bg-alt border-b border-border">
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.issuer')}</th>
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.invoice_number')}</th>
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                  <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.total_amount')}</th>
                  <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.withheld_tax')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
                  : !rows?.length
                  ? <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
                  : rows.map((row, i) => (
                      <tr key={i} className="hover:bg-bg-alt/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-[12px] text-fg-tertiary">{new Date(row.created_at).toLocaleDateString('el-GR')}</td>
                        <td className="px-4 py-3 text-fg-primary max-w-[160px] truncate">{row.issuer}</td>
                        <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{row.invoice_number}</td>
                        <td className="px-4 py-3 text-fg-secondary max-w-[120px] truncate">{row.company_name}</td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] text-fg-primary">{fmt(row.total_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[12px] font-bold text-error">{fmt(row.withheld_tax)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
