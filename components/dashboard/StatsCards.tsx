'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { FileText, CheckCircle2, AlertTriangle, CreditCard } from 'lucide-react'

interface StatsCardsProps {
  orgId: string
  setupId: string
  companyId: string | null
}

interface StatCard {
  key: string
  icon: React.ReactNode
  value: number | string
  loading: boolean
  color: string
}

function useStatCount(
  orgId: string,
  setupId: string,
  table: string,
  filters: Record<string, unknown>,
) {
  return useQuery({
    queryKey: ['stat', table, orgId, setupId, filters],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('setup_id', setupId)

      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined) q = q.eq(k, v as string | boolean | number)
      }

      const { count, error } = await q
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30_000,
  })
}

export function StatsCards({ orgId, setupId, companyId }: StatsCardsProps) {
  const t = useT()

  const baseFilters = companyId ? { company_id: companyId } : {}

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const total = useStatCount(orgId, setupId, 'invoices', baseFilters)
  const skipped = useStatCount(orgId, setupId, 'skipped_docs', baseFilters)
  const needsReview = useStatCount(orgId, setupId, 'invoices', { ...baseFilters, needs_review: true })

  const bankUnmatched = useQuery({
    queryKey: ['stat', 'bank_docs_unmatched', orgId, setupId, companyId],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('bank_docs')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .is('invoice_id', null)

      if (companyId) q = q.eq('company_id', companyId)

      const { count, error } = await q
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30_000,
  })

  const processedMonth = useQuery({
    queryKey: ['stat', 'processed_month', orgId, setupId, companyId, monthStart],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('status', 'filed')
        .gte('created_at', monthStart)

      if (companyId) q = q.eq('company_id', companyId)

      const { count, error } = await q
      if (error) throw error
      return count ?? 0
    },
    staleTime: 30_000,
  })

  const cards: StatCard[] = [
    {
      key: t('dashboard.stats.total_invoices'),
      icon: <FileText size={20} />,
      value: total.data ?? 0,
      loading: total.isLoading,
      color: 'text-primary',
    },
    {
      key: t('dashboard.stats.processed_today'),
      icon: <CheckCircle2 size={20} />,
      value: processedMonth.data ?? 0,
      loading: processedMonth.isLoading,
      color: 'text-success',
    },
    {
      key: t('dashboard.stats.pending_review'),
      icon: <AlertTriangle size={20} />,
      value: needsReview.data ?? 0,
      loading: needsReview.isLoading,
      color: 'text-warning',
    },
    {
      key: t('dashboard.stats.skipped'),
      icon: <CreditCard size={20} />,
      value: bankUnmatched.data ?? 0,
      loading: bankUnmatched.isLoading,
      color: 'text-error',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="bg-bg-surface rounded-xl border border-border p-5 shadow-sm"
        >
          <div className={`mb-3 ${card.color}`}>{card.icon}</div>
          <div className="font-body text-fg-secondary text-small mb-1">{card.key}</div>
          {card.loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-bg-alt" />
          ) : (
            <div className="font-sans font-bold text-fg-primary" style={{ fontSize: 28 }}>
              {typeof card.value === 'number' ? card.value.toLocaleString('el-GR') : card.value}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
