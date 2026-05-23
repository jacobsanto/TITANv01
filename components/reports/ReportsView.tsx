'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Loader2 } from 'lucide-react'
import { VatReportTab } from './tabs/VatReportTab'
import { WithholdingTab } from './tabs/WithholdingTab'
import { PaymentComplianceTab } from './tabs/PaymentComplianceTab'
import { AccountantExportTab } from './tabs/AccountantExportTab'
import { ExceptionsTab } from './tabs/ExceptionsTab'

type Tab = 'vat' | 'withholding' | 'payment' | 'export' | 'exceptions'

export function ReportsView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('vat')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'vat', label: t('reports.vat') },
    { key: 'withholding', label: t('reports.withholding') },
    { key: 'payment', label: t('reports.payment_compliance') },
    { key: 'export', label: t('reports.accountant_export') },
    { key: 'exceptions', label: t('reports.exceptions') },
  ]

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 size={32} className="animate-spin text-fg-tertiary" /></div>
  if (error || !orgId || !setupId) return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{error ?? t('common.error')}</div>

  return (
    <div className="flex flex-col min-h-full">
      <div className="hidden md:flex sticky top-0 z-10 items-center px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('reports.title')}</h1>
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
        {activeTab === 'vat' && <VatReportTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'withholding' && <WithholdingTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'payment' && <PaymentComplianceTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'export' && <AccountantExportTab orgId={orgId} setupId={setupId} />}
        {activeTab === 'exceptions' && <ExceptionsTab orgId={orgId} setupId={setupId} />}
      </div>
    </div>
  )
}
