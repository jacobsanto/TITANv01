'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface JobHistoryTabProps {
  orgId: string
}

interface JobRun {
  id: string
  job_type: string
  status: string
  started_at: string
  completed_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
}

interface QueueItem {
  id: string
  entity_type: string
  entity_id: string
  status: string
  priority: number
  created_at: string
  started_at: string | null
  error_message: string | null
}

const PAGE_SIZE = 30

function statusVariant(s: string): 'success' | 'error' | 'info' | 'warning' | 'neutral' {
  switch (s) {
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'running': return 'info'
    case 'pending': return 'warning'
    default: return 'neutral'
  }
}

function duration(start: string, end: string | null): string {
  if (!end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}

export function JobHistoryTab({ orgId }: JobHistoryTabProps) {
  const t = useT()
  const [activeSection, setActiveSection] = useState<'history' | 'queue'>('history')
  const [page, setPage] = useState(0)

  const { data: jobData, isLoading: jobsLoading } = useQuery({
    queryKey: ['job_runs_full', orgId, page],
    queryFn: async () => {
      const supabase = createClient()
      const { data, count, error } = await supabase
        .from('job_runs')
        .select('id,job_type,status,started_at,completed_at,error_message,metadata', { count: 'exact' })
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) throw error
      return { rows: (data as unknown as JobRun[]) ?? [], total: count ?? 0 }
    },
    enabled: activeSection === 'history',
    staleTime: 15_000,
  })

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['processing_queue', orgId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('processing_queue')
        .select('id,entity_type,entity_id,status,priority,created_at,started_at,error_message')
        .eq('org_id', orgId)
        .in('status', ['pending', 'running', 'failed'])
        .order('priority', { ascending: false })
        .order('created_at')
        .limit(100)
      if (error) throw error
      return (data as unknown as QueueItem[]) ?? []
    },
    enabled: activeSection === 'queue',
    staleTime: 15_000,
    refetchInterval: 15_000,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b border-border">
        {(['history', 'queue'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 text-small font-sans font-medium transition-colors relative ${activeSection === section ? 'text-primary' : 'text-fg-tertiary hover:text-fg-secondary'}`}
          >
            {section === 'history' ? t('monitoring.job_history') : t('monitoring.queue')}
            {activeSection === section && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-primary" />}
          </button>
        ))}
      </div>

      {activeSection === 'history' && (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Job</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.job_status')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Duration</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.message')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobsLoading
                ? Array.from({ length: 8 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
                : !jobData?.rows.length
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
                : jobData.rows.map((job) => (
                    <tr key={job.id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-tertiary whitespace-nowrap">
                        {new Date(job.started_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-fg-primary">{job.job_type}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(job.status)}>{job.status}</Badge></td>
                      <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{duration(job.started_at, job.completed_at)}</td>
                      <td className="px-4 py-3 text-fg-tertiary text-[12px] max-w-[240px] truncate">{job.error_message ?? '—'}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {(jobData?.total ?? 0) > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-alt">
              <span className="text-[12px] text-fg-tertiary">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, jobData?.total ?? 0)} / {jobData?.total}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40"><ChevronLeft size={16} /></button>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= (jobData?.total ?? 0)} className="p-1.5 rounded text-fg-tertiary hover:text-fg-primary disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'queue' && (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.entity_type')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.entity_id')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('monitoring.job_status')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Priority</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queueLoading
                ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
                : !queueData?.length
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
                : queueData.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[12px] text-fg-primary">{item.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-tertiary">{item.entity_id.slice(0, 12)}…</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(item.status)}>{item.status}</Badge></td>
                      <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{item.priority}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-tertiary">{new Date(item.created_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
