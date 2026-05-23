'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { StatsCards } from './StatsCards'
import { InvoiceTable } from './InvoiceTable'
import { BankTransactionTable } from './BankTransactionTable'
import { ReviewQueue } from './ReviewQueue'
import { SkippedDocsTable } from './SkippedDocsTable'
import { SchedulePanel } from './SchedulePanel'
import { GmailFetchMenu } from './GmailFetchMenu'
import { Loader2, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

type Tab = 'overview' | 'invoices' | 'bank' | 'review' | 'skipped'

interface Company {
  id: string
  name: string
}

export function DashboardView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  const { data: companies } = useQuery({
    queryKey: ['companies', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('id,name')
        .eq('org_id', orgId!)
        .eq('setup_id', setupId!)
        .order('name')

      if (error) throw error
      return (data as Company[]) ?? []
    },
    enabled: !!orgId && !!setupId,
    staleTime: 60_000,
  })

  const companyId = selectedCompany === 'all' ? null : selectedCompany

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('dashboard.overview') },
    { key: 'invoices', label: t('dashboard.invoices') },
    { key: 'bank', label: t('dashboard.bank_transactions') },
    { key: 'review', label: t('dashboard.review_queue') },
    { key: 'skipped', label: t('dashboard.skipped_docs') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-fg-tertiary" />
      </div>
    )
  }

  if (error || !orgId || !setupId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">
        {error ?? t('common.error')}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 border-b border-border bg-bg-surface"
        style={{ height: 'var(--header)' }}
      >
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>
          {t('dashboard.title')}
        </h1>

        <div className="flex items-center gap-3">
          {/* Company selector */}
          {companies && companies.length > 1 && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">{t('common.all')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => qc.invalidateQueries()}
            className="p-2 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-alt transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={16} />
          </button>

          <GmailFetchMenu orgId={orgId} setupId={setupId} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-small font-sans font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-fg-tertiary hover:text-fg-secondary'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: 'var(--color-primary)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-6">
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6 max-w-5xl">
            <StatsCards orgId={orgId} setupId={setupId} companyId={companyId} />
            <SchedulePanel orgId={orgId} setupId={setupId} />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="max-w-6xl">
            <InvoiceTable orgId={orgId} setupId={setupId} companyId={companyId} />
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="max-w-6xl">
            <BankTransactionTable orgId={orgId} setupId={setupId} companyId={companyId} />
          </div>
        )}

        {activeTab === 'review' && (
          <div className="max-w-3xl">
            <ReviewQueue orgId={orgId} setupId={setupId} companyId={companyId} />
          </div>
        )}

        {activeTab === 'skipped' && (
          <div className="max-w-5xl">
            <SkippedDocsTable orgId={orgId} setupId={setupId} companyId={companyId} />
          </div>
        )}
      </div>
    </div>
  )
}
