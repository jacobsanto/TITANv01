'use client'

import { useState } from 'react'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Loader2 } from 'lucide-react'
import { GlobalSettingsTab } from './tabs/GlobalSettingsTab'
import { CompaniesTab } from './tabs/CompaniesTab'
import { BankRulesTab } from './tabs/BankRulesTab'
import { NamingRulesTab } from './tabs/NamingRulesTab'
import { FilingFlowsTab } from './tabs/FilingFlowsTab'
import { RulesEngineTab } from './tabs/RulesEngineTab'
import { GmailSearchTab } from './tabs/GmailSearchTab'
import { GoogleApisTab } from './tabs/GoogleApisTab'
import { SupplierAliasesTab } from './tabs/SupplierAliasesTab'
import { ExtractionPromptsTab } from './tabs/ExtractionPromptsTab'

type Tab =
  | 'global'
  | 'companies'
  | 'bank_rules'
  | 'naming_rules'
  | 'filing_flows'
  | 'rules_engine'
  | 'gmail_search'
  | 'google_apis'
  | 'supplier_aliases'
  | 'extraction_prompts'

export function ConfigView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('global')

  const TABS: { key: Tab; label: string }[] = [
    { key: 'global', label: t('config.global_settings') },
    { key: 'companies', label: t('config.companies') },
    { key: 'bank_rules', label: t('config.bank_rules') },
    { key: 'naming_rules', label: t('config.naming_rules') },
    { key: 'filing_flows', label: t('config.filing_flows') },
    { key: 'rules_engine', label: t('config.rules_engine') },
    { key: 'gmail_search', label: t('config.gmail_search') },
    { key: 'google_apis', label: t('config.google_apis') },
    { key: 'supplier_aliases', label: t('config.supplier_aliases') },
    { key: 'extraction_prompts', label: t('config.extraction_prompts') },
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
        className="sticky top-0 z-10 flex items-center px-6 border-b border-border bg-bg-surface"
        style={{ height: 'var(--header)' }}
      >
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>
          {t('config.title')}
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Vertical tab sidebar */}
        <nav
          className="flex-shrink-0 border-r border-border bg-bg-alt overflow-y-auto py-3"
          style={{ width: 200 }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full text-left px-4 py-2.5 text-small font-sans transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/8 text-primary font-semibold border-r-2 border-primary'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'global' && <GlobalSettingsTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'companies' && <CompaniesTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'bank_rules' && <BankRulesTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'naming_rules' && <NamingRulesTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'filing_flows' && <FilingFlowsTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'rules_engine' && <RulesEngineTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'gmail_search' && <GmailSearchTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'google_apis' && <GoogleApisTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'supplier_aliases' && <SupplierAliasesTab orgId={orgId} setupId={setupId} />}
          {activeTab === 'extraction_prompts' && <ExtractionPromptsTab orgId={orgId} setupId={setupId} />}
        </div>
      </div>
    </div>
  )
}
