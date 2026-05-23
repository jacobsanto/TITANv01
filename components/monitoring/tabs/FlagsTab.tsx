'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'

interface FlagsTabProps {
  orgId: string
  setupId: string
}

interface SystemFlag {
  id: string
  flag_type: string
  severity: 'critical' | 'warning' | 'info'
  entity_type: string | null
  entity_id: string | null
  message: string
  details: Record<string, unknown> | null
  resolved: boolean
  created_at: string
}

const PAGE_SIZE = 25

function severityVariant(s: string): 'error' | 'warning' | 'info' {
  if (s === 'critical') return 'error'
  if (s === 'warning') return 'warning'
  return 'info'
}

export function FlagsTab({ orgId, setupId }: FlagsTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [showResolved, setShowResolved] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['flags', orgId, page, showResolved],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('system_flags')
        .select('id,flag_type,severity,entity_type,entity_id,message,details,resolved,created_at', { count: 'exact' })
        .eq('org_id', orgId)
        .eq('resolved', showResolved)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const { data, count, error } = await q
      if (error) throw error
      return { rows: (data as unknown as SystemFlag[]) ?? [], total: count ?? 0 }
    },
    staleTime: 30_000,
  })

  async function handleResolve(id: string) {
    setResolvingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('system_flags')
        .update({ resolved: true })
        .eq('id', id)
        .eq('org_id', orgId)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['flags', orgId] })
    } finally {
      setResolvingId(null)
    }
  }

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-resolved"
            checked={showResolved}
            onChange={(e) => { setShowResolved(e.target.checked); setPage(0) }}
            className="rounded border-border-strong"
          />
          <label htmlFor="show-resolved" className="text-small text-fg-secondary">{t('monitoring.resolved')}</label>
        </div>
        <span className="ml-auto text-small text-fg-tertiary">{total} flags</span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.severity')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.flag_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.message')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.entity_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
              {!showResolved && <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>
                ))
              : rows.length === 0
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : rows.map((flag) => (
                  <tr key={flag.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant={severityVariant(flag.severity)}>{flag.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{flag.flag_type}</td>
                    <td className="px-4 py-3 text-fg-primary max-w-[280px] truncate">{flag.message}</td>
                    <td className="px-4 py-3 text-fg-secondary text-[12px]">{flag.entity_type ?? '—'}</td>
                    <td className="px-4 py-3 text-fg-tertiary text-[12px] font-mono">
                      {new Date(flag.created_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    {!showResolved && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(flag.id)}
                          disabled={resolvingId === flag.id}
                          className="text-success hover:text-success"
                        >
                          <CheckCircle2 size={13} className="mr-1" />
                          {t('monitoring.resolved')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-alt">
            <span className="text-[12px] text-fg-tertiary">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
