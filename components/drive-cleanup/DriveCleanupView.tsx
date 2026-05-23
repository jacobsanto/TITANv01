'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { DuplicatesTab, type ScanResult } from './tabs/DuplicatesTab'
import { OrphansTab } from './tabs/OrphansTab'
import { MergeFoldersTab } from './tabs/MergeFoldersTab'
import { Loader2, ScanLine } from 'lucide-react'

type Tab = 'duplicates' | 'orphans' | 'merge'

export function DriveCleanupView() {
  const t = useT()
  const { orgId, setupId, loading, error } = useOrg()
  const [activeTab, setActiveTab] = useState<Tab>('duplicates')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'duplicates', label: t('drive.duplicates'), count: scanResult?.duplicates.length },
    { key: 'orphans', label: t('drive.orphans'), count: scanResult?.orphans.length },
    { key: 'merge', label: t('drive.merge_folders') },
  ]

  async function handleScan() {
    if (!orgId || !setupId) return
    setScanning(true)
    setScanError(null)
    try {
      const result = await callEdge<ScanResult>('scan-drive-cleanup', {
        org_id: orgId,
        setup_id: setupId,
      })
      setScanResult(result)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setScanning(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 size={32} className="animate-spin text-fg-tertiary" /></div>
  if (error || !orgId || !setupId) return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{error ?? t('common.error')}</div>

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('drive.cleanup')}</h1>
        {activeTab !== 'merge' && (
          <Button variant="primary" size="sm" onClick={handleScan} disabled={scanning}>
            {scanning
              ? <Loader2 size={14} className="mr-1.5 animate-spin" />
              : <ScanLine size={14} className="mr-1.5" />}
            {scanning ? t('common.loading') : t('drive.scan')}
          </Button>
        )}
      </div>

      {scanError && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">
          {scanError}
        </div>
      )}

      <div className="flex items-center gap-1 px-6 pt-4 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-small font-sans font-medium transition-colors relative flex items-center gap-2 ${activeTab === tab.key ? 'text-primary' : 'text-fg-tertiary hover:text-fg-secondary'}`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-error/10 text-error text-[10px] font-bold">
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-primary" />}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6">
        {activeTab === 'duplicates' && <DuplicatesTab orgId={orgId} setupId={setupId} scanResult={scanResult} scanning={scanning} />}
        {activeTab === 'orphans' && <OrphansTab orgId={orgId} setupId={setupId} scanResult={scanResult} scanning={scanning} />}
        {activeTab === 'merge' && <MergeFoldersTab orgId={orgId} setupId={setupId} />}
      </div>
    </div>
  )
}
