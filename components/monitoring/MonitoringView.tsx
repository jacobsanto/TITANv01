'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Loader2 } from 'lucide-react'
import { SystemHealthTab } from './tabs/SystemHealthTab'
import { FlagsTab } from './tabs/FlagsTab'
import { AuditLogTab } from './tabs/AuditLogTab'
import { JobHistoryTab } from './tabs/JobHistoryTab'

type Tab = 'health' | 'flags' | 'audit' | 'jobs'

export function MonitoringView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('health')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'health', label: t('monitoring.system_health') },
    { key: 'flags', label: t('monitoring.flags') },
    { key: 'audit', label: t('monitoring.audit_log') },
    { key: 'jobs', label: t('monitoring.job_history') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-fg-tertiary" />
      </div>
    )
  }

  if (error || !orgId || !setupId) {
    return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{error ?? t('common.error')}</div>
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('monitoring.title')}</h1>
      </div>

      <div className="flex items-center gap-1 px-6 pt-4 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-small font-sans font-medium transition-colors relative ${activeTab === tab.key ? 'text-primary' : 'text-fg-tertiary hover:text-fg-secondary'}`}
          >
            {tab.label}
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-primary" />}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6">
        {activeTab === 'health' && <SystemHealthTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'flags' && <FlagsTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'audit' && <AuditLogTab orgId={orgId} />}
        {activeTab === 'jobs' && <JobHistoryTab orgId={orgId} />}
      </div>
    </div>
  )
}
