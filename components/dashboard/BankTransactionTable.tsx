'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

interface BankTransactionTableProps {
  orgId: string
  setupId: string
  companyId: string | null
}

interface BankDoc {
  id: string
  created_at: string
  description: string | null
  amount: number | null
  tx_type: string | null
  invoice_id: string | null
  company_id: string
  companies?: { name: string } | null
}

const PAGE_SIZE = 20

export function BankTransactionTable({ orgId, setupId, companyId }: BankTransactionTableProps) {
  const t = useT()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [recheckingId, setRecheckingId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['bank_docs', orgId, setupId, companyId, page],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('bank_docs')
        .select('id,created_at,description,amount,tx_type,invoice_id,company_id,companies(name)', {
          count: 'exact',
        })
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (companyId) q = q.eq('company_id', companyId)

      const { data, count, error } = await q
      if (error) throw error
      return { rows: (data as unknown as BankDoc[]) ?? [], total: count ?? 0 }
    },
    staleTime: 30_000,
  })

  async function handleRecheck(id: string) {
    setRecheckingId(id)
    try {
      await callEdge('recheck-bank-doc', { bank_doc_id: id })
      qc.invalidateQueries({ queryKey: ['bank_docs', orgId, setupId] })
    } finally {
      setRecheckingId(null)
    }
  }

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <span className="text-small text-fg-tertiary">{total.toLocaleString('el-GR')} {t('dashboard.bank_transactions').toLowerCase()}</span>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto bg-bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.source')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.tx_type')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.amount')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.status')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-bg-alt" style={{ width: '75%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : error
                ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-fg-tertiary">{t('common.error')}</td>
                    </tr>
                  )
                : rows.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td>
                    </tr>
                  )
                : rows.map((row) => (
                    <tr key={row.id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 text-fg-secondary font-mono text-[12px]">
                        {new Date(row.created_at).toLocaleDateString('el-GR')}
                      </td>
                      <td className="px-4 py-3 text-fg-primary max-w-[200px] truncate">
                        {row.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary max-w-[120px] truncate">
                        {row.companies?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {row.tx_type ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-fg-primary">
                        {row.amount != null
                          ? row.amount.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.invoice_id ? (
                          <Badge variant="success">Matched</Badge>
                        ) : (
                          <Badge variant="warning">Unmatched</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
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
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40"
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
