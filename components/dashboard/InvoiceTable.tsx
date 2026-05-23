'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RotateCcw, ExternalLink, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface InvoiceTableProps {
  orgId: string
  setupId: string
  companyId: string | null
}

interface Invoice {
  id: string
  created_at: string
  invoice_number: string | null
  mark_number: string | null
  issuer: string | null
  total_amount: number | null
  status: string
  confidence: number | null
  needs_review: boolean
  drive_url: string | null
  company_id: string
  companies?: { name: string } | null
}

const PAGE_SIZE = 20

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (status) {
    case 'filed': return 'success'
    case 'pending': return 'warning'
    case 'error': return 'error'
    case 'processing': return 'info'
    default: return 'neutral'
  }
}

function confidenceBadge(c: number | null) {
  if (c === null) return null
  const pct = Math.round(c * 100)
  const variant = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error'
  return <Badge variant={variant}>{pct}%</Badge>
}

export function InvoiceTable({ orgId, setupId, companyId }: InvoiceTableProps) {
  const t = useT()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [recheckingId, setRecheckingId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', orgId, setupId, companyId, page, search],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('invoices')
        .select('id,created_at,invoice_number,mark_number,issuer,total_amount,status,confidence,needs_review,drive_url,company_id,companies(name)', {
          count: 'exact',
        })
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (companyId) q = q.eq('company_id', companyId)
      if (search.trim()) q = q.ilike('issuer', `%${search.trim()}%`)

      const { data, count, error } = await q
      if (error) throw error
      return { rows: (data as unknown as Invoice[]) ?? [], total: count ?? 0 }
    },
    staleTime: 30_000,
  })

  async function handleRecheck(id: string) {
    setRecheckingId(id)
    try {
      await callEdge('recheck-invoice', { invoice_id: id })
      qc.invalidateQueries({ queryKey: ['invoices', orgId, setupId] })
    } finally {
      setRecheckingId(null)
    }
  }

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-8 h-9 text-small"
          />
        </div>
        <span className="text-small text-fg-tertiary ml-auto">{total.toLocaleString('el-GR')} {t('dashboard.invoices').toLowerCase()}</span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.invoice_number')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.issuer')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.total_amount')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.status')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.confidence')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-bg-alt" style={{ width: j === 7 ? 64 : '80%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : error
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-fg-tertiary">{t('common.error')}</td>
                    </tr>
                  )
                : rows.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td>
                    </tr>
                  )
                : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 text-fg-secondary font-mono text-[12px]">
                        {new Date(row.created_at).toLocaleDateString('el-GR')}
                      </td>
                      <td className="px-4 py-3 text-fg-primary font-mono text-[12px]">
                        {row.invoice_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-primary max-w-[160px] truncate">
                        {row.issuer ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary max-w-[120px] truncate">
                        {row.companies?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-primary text-right font-mono">
                        {row.total_amount != null
                          ? row.total_amount.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {confidenceBadge(row.confidence)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.drive_url && (
                            <a
                              href={row.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors"
                              title={t('dashboard.drive_url')}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button
                            onClick={() => handleRecheck(row.id)}
                            disabled={recheckingId === row.id}
                            className="p-1.5 rounded-md text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors disabled:opacity-50"
                            title={t('dashboard.recheck')}
                          >
                            <RotateCcw size={14} className={recheckingId === row.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-alt">
            <span className="text-[12px] text-fg-tertiary">
              {t('common.previous')} {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
