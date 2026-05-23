'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { AuditResultsTab } from './tabs/AuditResultsTab'
import { MisfiledTab } from './tabs/MisfiledTab'
import { VerifyFilesTab } from './tabs/VerifyFilesTab'
import { Loader2 } from 'lucide-react'

type Tab = 'audit' | 'misfiled' | 'verify'

export function DriveAuditView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('audit')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'audit', label: t('drive.audit_results') },
    { key: 'misfiled', label: t('drive.misfiled') },
    { key: 'verify', label: t('config.verify_folders') },
  ]

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 size={32} className="animate-spin text-fg-tertiary" /></div>
  if (error || !orgId || !setupId) return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{error ?? t('common.error')}</div>

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('drive.audit')}</h1>
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
        {activeTab === 'audit' && <AuditResultsTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'misfiled' && <MisfiledTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'verify' && <VerifyFilesTab orgId={orgId} setupId={setupId} />}
      </div>
    </div>
  )
}
