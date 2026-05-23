'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DateRangePicker, defaultRange } from '../DateRangePicker'
import { RotateCcw, ExternalLink } from 'lucide-react'

interface ExceptionsTabProps {
  orgId: string
  setupId: string
}

interface ExceptionRow {
  id: string
  invoice_number: string | null
  issuer: string | null
  company_name: string
  status: string
  confidence: number | null
  drive_url: string | null
  created_at: string
  error_type: string
}

export function ExceptionsTab({ orgId, setupId }: ExceptionsTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [range, setRange] = useState(defaultRange)
  const [generate, setGenerate] = useState(false)
  const [retriageId, setRetrageId] = useState<string | null>(null)

  const { data: rows, isLoading } = useQuery({
    queryKey: ['exceptions', orgId, setupId, range.from, range.to],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('invoices')
        .select('id,invoice_number,issuer,status,confidence,drive_url,created_at,companies(name)')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .in('status', ['error', 'skipped', 'failed'])
        .gte('created_at', range.from)
        .lte('created_at', range.to + 'T23:59:59')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map((inv: Record<string, unknown>) => ({
        id: inv.id as string,
        invoice_number: inv.invoice_number as string | null,
        issuer: inv.issuer as string | null,
        company_name: (inv.companies as unknown as { name: string } | null)?.name ?? 'Unknown',
        status: inv.status as string,
        confidence: inv.confidence as number | null,
        drive_url: inv.drive_url as string | null,
        created_at: inv.created_at as string,
        error_type: inv.status as string,
      })) as ExceptionRow[]
    },
    enabled: generate,
    staleTime: 30_000,
  })

  async function handleRetriage(id: string) {
    setRetrageId(id)
    try {
      await callEdge('retriage-invoices', { invoice_ids: [id], org_id: orgId, setup_id: setupId })
      qc.invalidateQueries({ queryKey: ['exceptions', orgId, setupId] })
    } finally {
      setRetrageId(null)
    }
  }

  function statusVariant(s: string): 'error' | 'warning' | 'neutral' {
    if (s === 'error' || s === 'failed') return 'error'
    if (s === 'skipped') return 'warning'
    return 'neutral'
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div className="flex items-end gap-4 flex-wrap">
        <DateRangePicker from={range.from} to={range.to} onFromChange={(v) => setRange(r => ({ ...r, from: v }))} onToChange={(v) => setRange(r => ({ ...r, to: v }))} />
        <Button variant="primary" size="sm" onClick={() => setGenerate(true)} className="mb-0.5">{t('reports.generate')}</Button>
      </div>

      {generate && (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.issuer')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.status')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.confidence')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
                : !rows?.length
                ? <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
                : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-tertiary">{new Date(row.created_at).toLocaleDateString('el-GR')}</td>
                      <td className="px-4 py-3 text-fg-primary max-w-[160px] truncate">{row.issuer ?? '—'}</td>
                      <td className="px-4 py-3 text-fg-secondary max-w-[120px] truncate">{row.company_name}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(row.status)}>{row.status}</Badge></td>
                      <td className="px-4 py-3 text-fg-secondary text-[12px]">
                        {row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.drive_url && (
                            <a href={row.drive_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors">
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            onClick={() => handleRetriage(row.id)}
                            disabled={retriageId === row.id}
                            className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors disabled:opacity-50"
                            title={t('dashboard.recheck')}
                          >
                            <RotateCcw size={13} className={retriageId === row.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
