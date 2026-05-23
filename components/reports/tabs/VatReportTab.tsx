'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { DateRangePicker, defaultRange, toCsv, downloadCsv } from '../DateRangePicker'
import { Download } from 'lucide-react'

interface VatReportTabProps {
  orgId: string
  setupId: string
}

interface VatRow {
  company_name: string
  invoice_count: number
  net_amount: number
  vat_amount: number
  total_amount: number
}

export function VatReportTab({ orgId, setupId }: VatReportTabProps) {
  const t = useT()
  const [range, setRange] = useState(defaultRange)
  const [generate, setGenerate] = useState(false)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['vat_report', orgId, setupId, range.from, range.to],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('companies(name),net_amount,vat_amount,total_amount')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('status', 'filed')
        .gte('created_at', range.from)
        .lte('created_at', range.to + 'T23:59:59')

      if (error) throw error

      const grouped: Record<string, VatRow> = {}
      for (const inv of data ?? []) {
        const name = (inv.companies as unknown as { name: string } | null)?.name ?? 'Unknown'
        if (!grouped[name]) grouped[name] = { company_name: name, invoice_count: 0, net_amount: 0, vat_amount: 0, total_amount: 0 }
        grouped[name].invoice_count++
        grouped[name].net_amount += inv.net_amount ?? 0
        grouped[name].vat_amount += inv.vat_amount ?? 0
        grouped[name].total_amount += inv.total_amount ?? 0
      }

      return Object.values(grouped).sort((a, b) => b.total_amount - a.total_amount)
    },
    enabled: generate,
    staleTime: 60_000,
  })

  const totals = rows?.reduce((acc, r) => ({
    invoice_count: acc.invoice_count + r.invoice_count,
    net_amount: acc.net_amount + r.net_amount,
    vat_amount: acc.vat_amount + r.vat_amount,
    total_amount: acc.total_amount + r.total_amount,
  }), { invoice_count: 0, net_amount: 0, vat_amount: 0, total_amount: 0 })

  function fmt(n: number) {
    return n.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
  }

  function handleDownload() {
    if (!rows?.length) return
    downloadCsv(toCsv(rows.map(r => ({
      [t('common.company')]: r.company_name,
      [t('reports.net_amount')]: r.net_amount.toFixed(2),
      [t('dashboard.vat_amount')]: r.vat_amount.toFixed(2),
      [t('dashboard.total_amount')]: r.total_amount.toFixed(2),
      'Invoices': r.invoice_count,
    }))), `vat-report-${range.from}-${range.to}.csv`)
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div className="flex items-end gap-4 flex-wrap">
        <DateRangePicker from={range.from} to={range.to} onFromChange={(v) => setRange(r => ({ ...r, from: v }))} onToChange={(v) => setRange(r => ({ ...r, to: v }))} />
        <Button variant="primary" size="sm" onClick={() => setGenerate(true)} className="mb-0.5">
          {t('reports.generate')}
        </Button>
        {rows?.length ? (
          <Button variant="outline" size="sm" onClick={handleDownload} className="mb-0.5">
            <Download size={14} className="mr-1.5" />
            {t('reports.download_csv')}
          </Button>
        ) : null}
      </div>

      {generate && (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Invoices</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('reports.net_amount')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.vat_amount')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.total_amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
                : !rows?.length
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
                : rows.map((row) => (
                    <tr key={row.company_name} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 text-fg-primary font-sans font-medium">{row.company_name}</td>
                      <td className="px-4 py-3 text-fg-secondary text-right font-mono text-[12px]">{row.invoice_count}</td>
                      <td className="px-4 py-3 text-fg-primary text-right font-mono text-[12px]">{fmt(row.net_amount)}</td>
                      <td className="px-4 py-3 text-fg-primary text-right font-mono text-[12px]">{fmt(row.vat_amount)}</td>
                      <td className="px-4 py-3 text-fg-primary text-right font-mono font-bold text-[12px]">{fmt(row.total_amount)}</td>
                    </tr>
                  ))}
              {totals && rows && rows.length > 1 && (
                <tr className="bg-bg-alt font-sans font-bold border-t-2 border-border-strong">
                  <td className="px-4 py-3 text-fg-primary">Σύνολο</td>
                  <td className="px-4 py-3 text-fg-primary text-right font-mono">{totals.invoice_count}</td>
                  <td className="px-4 py-3 text-fg-primary text-right font-mono">{fmt(totals.net_amount)}</td>
                  <td className="px-4 py-3 text-fg-primary text-right font-mono">{fmt(totals.vat_amount)}</td>
                  <td className="px-4 py-3 text-fg-primary text-right font-mono">{fmt(totals.total_amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
