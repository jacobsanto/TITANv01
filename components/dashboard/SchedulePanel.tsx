'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, FileText, Layers, Play, Clock } from 'lucide-react'

interface SchedulePanelProps {
  orgId: string
  setupId: string
}

type JobType = 'fetch-gmail-attachments' | 'process-invoices' | 'process-bank-docs' | 'process-queue'

interface JobRun {
  id: string
  job_type: string
  status: string
  started_at: string
  completed_at: string | null
  error_message: string | null
}

const JOB_CONFIGS: { type: JobType; label: string; icon: React.ReactNode }[] = [
  { type: 'fetch-gmail-attachments', label: 'dashboard.fetch_gmail', icon: <Mail size={18} /> },
  { type: 'process-invoices', label: 'dashboard.process_invoices', icon: <FileText size={18} /> },
  { type: 'process-queue', label: 'dashboard.process_bank', icon: <Layers size={18} /> },
]

function statusVariant(status: string): 'success' | 'error' | 'info' | 'warning' | 'neutral' {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'running': return 'info'
    case 'pending': return 'warning'
    default: return 'neutral'
  }
}

export function SchedulePanel({ orgId, setupId }: SchedulePanelProps) {
  const t = useT()
  const qc = useQueryClient()
  const [runningJob, setRunningJob] = useState<JobType | null>(null)

  const { data: recentRuns } = useQuery({
    queryKey: ['job_runs', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('job_runs')
        .select('id,job_type,status,started_at,completed_at,error_message')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return (data as JobRun[]) ?? []
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  async function runJob(jobType: JobType) {
    setRunningJob(jobType)
    try {
      await callEdge(jobType, { org_id: orgId, setup_id: setupId })
      qc.invalidateQueries({ queryKey: ['job_runs', orgId, setupId] })
      qc.invalidateQueries({ queryKey: ['invoices', orgId, setupId] })
      qc.invalidateQueries({ queryKey: ['bank_docs', orgId, setupId] })
    } finally {
      setRunningJob(null)
    }
  }

  function lastRunForJob(type: string) {
    return recentRuns?.find((r) => r.job_type === type)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {JOB_CONFIGS.map(({ type, label, icon }) => {
          const lastRun = lastRunForJob(type)
          const isRunning = runningJob === type
          return (
            <div
              key={type}
              className="bg-bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 text-fg-secondary">{icon}<span className="font-sans font-medium text-small">{t(label)}</span></div>

              {lastRun && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(lastRun.status)}>{lastRun.status}</Badge>
                    <span className="text-[11px] text-fg-tertiary">
                      {new Date(lastRun.started_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {lastRun.error_message && (
                    <p className="text-[11px] text-error truncate">{lastRun.error_message}</p>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => runJob(type)}
                disabled={!!runningJob}
                className="mt-auto"
              >
                {isRunning ? (
                  <Clock size={14} className="mr-1.5 animate-pulse" />
                ) : (
                  <Play size={14} className="mr-1.5" />
                )}
                {isRunning ? t('common.loading') : t('dashboard.run_now')}
              </Button>
            </div>
          )
        })}
      </div>

      {recentRuns && recentRuns.length > 0 && (
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-bg-alt">
            <h3 className="font-sans font-semibold text-fg-primary text-small">{t('monitoring.job_history')}</h3>
          </div>
          <div className="divide-y divide-border">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-3 px-4 py-3">
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                <span className="text-small text-fg-primary flex-1">{run.job_type.replace(/-/g, ' ')}</span>
                <span className="text-[12px] text-fg-tertiary">
                  {new Date(run.started_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
