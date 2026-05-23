'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLogTabProps {
  orgId: string
}

interface AuditEntry {
  id: string
  action: string
  user_id: string | null
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  profiles?: { email: string } | null
}

const PAGE_SIZE = 30

export function AuditLogTab({ orgId }: AuditLogTabProps) {
  const t = useT()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['audit_log', orgId, page],
    queryFn: async () => {
      const supabase = createClient()
      const { data, count, error } = await supabase
        .from('audit_log')
        .select('id,action,user_id,entity_type,entity_id,details,created_at,profiles(email)', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error) throw error
      return { rows: (data as unknown as AuditEntry[]) ?? [], total: count ?? 0 }
    },
    staleTime: 30_000,
  })

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <span className="text-small text-fg-tertiary">{total.toLocaleString('el-GR')} {t('monitoring.audit_log').toLowerCase()}</span>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.action')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.user')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.entity_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>
                ))
              : rows.length === 0
              ? <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : rows.map((entry) => (
                  <tr key={entry.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg-tertiary font-mono text-[11px] whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-primary">{entry.action}</td>
                    <td className="px-4 py-3 text-fg-secondary text-[12px] max-w-[160px] truncate">
                      {entry.profiles?.email ?? entry.user_id?.slice(0, 8) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-fg-secondary text-[12px]">{entry.entity_type ?? '—'}</td>
                    <td className="px-4 py-3 text-fg-tertiary text-[11px] max-w-[240px] truncate font-mono">
                      {entry.details ? JSON.stringify(entry.details).slice(0, 80) : '—'}
                    </td>
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
