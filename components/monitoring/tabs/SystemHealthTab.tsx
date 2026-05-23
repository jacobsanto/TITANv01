'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react'

interface SystemHealthTabProps {
  orgId: string
  setupId: string
}

interface QueueCounts {
  pending: number
  running: number
  completed_today: number
  failed_today: number
}

interface FlagCounts {
  critical: number
  warning: number
  info: number
}

export function SystemHealthTab({ orgId, setupId }: SystemHealthTabProps) {
  const t = useT()

  const { data: queueCounts } = useQuery({
    queryKey: ['health_queue', orgId],
    queryFn: async () => {
      const supabase = createClient()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [pending, running, completedToday, failedToday] = await Promise.all([
        supabase.from('job_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'pending'),
        supabase.from('job_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'running'),
        supabase.from('job_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'completed').gte('started_at', todayStart.toISOString()),
        supabase.from('job_runs').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'failed').gte('started_at', todayStart.toISOString()),
      ])

      return {
        pending: pending.count ?? 0,
        running: running.count ?? 0,
        completed_today: completedToday.count ?? 0,
        failed_today: failedToday.count ?? 0,
      } as QueueCounts
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: flagCounts } = useQuery({
    queryKey: ['health_flags', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const [critical, warning, info] = await Promise.all([
        supabase.from('system_flags').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('severity', 'critical').eq('resolved', false),
        supabase.from('system_flags').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('severity', 'warning').eq('resolved', false),
        supabase.from('system_flags').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('severity', 'info').eq('resolved', false),
      ])
      return { critical: critical.count ?? 0, warning: warning.count ?? 0, info: info.count ?? 0 } as FlagCounts
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const isHealthy = (flagCounts?.critical ?? 0) === 0 && (queueCounts?.failed_today ?? 0) === 0
  const isDegraded = !isHealthy && (flagCounts?.critical ?? 0) < 3

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Overall status */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${isHealthy ? 'border-success/30 bg-success/5' : isDegraded ? 'border-warning/30 bg-warning/5' : 'border-error/30 bg-error/5'}`}>
        {isHealthy
          ? <CheckCircle2 size={20} className="text-success flex-shrink-0" />
          : isDegraded
          ? <AlertTriangle size={20} className="text-warning flex-shrink-0" />
          : <XCircle size={20} className="text-error flex-shrink-0" />}
        <div>
          <p className="font-sans font-semibold text-fg-primary">
            {isHealthy ? 'Operational' : isDegraded ? 'Degraded' : 'Issues Detected'}
          </p>
          <p className="text-small text-fg-secondary">{t('monitoring.system_health')}</p>
        </div>
        <Badge variant={isHealthy ? 'success' : isDegraded ? 'warning' : 'error'} className="ml-auto">
          {isHealthy ? 'OK' : isDegraded ? 'Degraded' : 'Error'}
        </Badge>
      </div>

      {/* Queue metrics */}
      <section>
        <h3 className="font-sans font-semibold text-fg-primary mb-3 flex items-center gap-2">
          <Activity size={16} className="text-fg-tertiary" />
          {t('monitoring.queue_status')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('monitoring.pending'), value: queueCounts?.pending ?? 0, variant: 'warning' as const },
            { label: t('monitoring.running'), value: queueCounts?.running ?? 0, variant: 'info' as const },
            { label: t('monitoring.completed'), value: queueCounts?.completed_today ?? 0, variant: 'success' as const },
            { label: t('monitoring.failed'), value: queueCounts?.failed_today ?? 0, variant: 'error' as const },
          ].map(({ label, value, variant }) => (
            <div key={label} className="bg-bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-1">{label}</p>
              <p className="font-sans font-bold text-fg-primary text-[28px]">{value}</p>
              <Badge variant={variant} className="mt-1 text-[10px]">{label}</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Flag counts */}
      <section>
        <h3 className="font-sans font-semibold text-fg-primary mb-3">{t('monitoring.flags')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('monitoring.critical'), value: flagCounts?.critical ?? 0, variant: 'error' as const },
            { label: t('monitoring.warning'), value: flagCounts?.warning ?? 0, variant: 'warning' as const },
            { label: t('monitoring.info'), value: flagCounts?.info ?? 0, variant: 'info' as const },
          ].map(({ label, value, variant }) => (
            <div key={label} className="bg-bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-1">{label}</p>
              <p className="font-sans font-bold text-fg-primary text-[28px]">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
