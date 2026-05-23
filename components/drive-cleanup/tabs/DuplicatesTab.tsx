'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Scan, ExternalLink, Trash2, Loader2 } from 'lucide-react'

interface DuplicatesTabProps {
  orgId: string
  setupId: string
  scanResult: ScanResult | null
  scanning: boolean
}

export interface CleanupItem {
  file_id: string
  file_name: string
  folder_id: string | null
  folder_name: string | null
  size_bytes: number | null
  last_modified: string | null
  issue_type: 'duplicate' | 'orphan'
  group_id: string | null
  drive_url: string | null
}

export interface ScanResult {
  duplicates: CleanupItem[]
  orphans: CleanupItem[]
  scanned_at: string
}

function fmtBytes(b: number | null): string {
  if (b === null) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export function DuplicatesTab({ orgId, setupId, scanResult, scanning }: DuplicatesTabProps) {
  const t = useT()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const items = scanResult?.duplicates ?? []

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map(i => i.file_id)))
  }

  async function handleDelete() {
    if (!selected.size) return
    setDeleting(true)
    try {
      await callEdge('execute-drive-audit-action', {
        org_id: orgId,
        setup_id: setupId,
        action_type: 'delete_files',
        file_ids: Array.from(selected),
      })
      setSelected(new Set())
    } finally {
      setDeleting(false)
    }
  }

  if (scanning) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Scan size={32} className="text-fg-tertiary animate-pulse" />
        <p className="text-small text-fg-tertiary">{t('drive.scan')}...</p>
      </div>
    )
  }

  if (!scanResult) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-fg-tertiary">
        <Scan size={32} className="opacity-40" />
        <p className="text-small">{t('drive.scan_results')} — {t('common.empty_state')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-small text-fg-secondary">
          {items.length} {t('drive.duplicates').toLowerCase()}
          {scanResult.scanned_at && (
            <span className="text-fg-tertiary ml-2">
              — {new Date(scanResult.scanned_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
        </span>
        {selected.size > 0 && (
          <Button variant="primary" size="sm" onClick={handleDelete} disabled={deleting}
            className="text-error border-error/30 bg-error/5 hover:bg-error/10">
            <Trash2 size={14} className="mr-1.5" />
            {deleting ? t('common.loading') : `${t('common.delete')} (${selected.size})`}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-success/5 p-8 text-center text-fg-secondary text-small">
          Δεν βρέθηκαν διπλότυπα.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="rounded border-border-strong" />
                </th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('drive.folder_name')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.name')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('drive.size')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('drive.last_modified')}</th>
                <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.file_id} className={`hover:bg-bg-alt/50 transition-colors ${selected.has(item.file_id) ? 'bg-error/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(item.file_id)} onChange={() => toggleSelect(item.file_id)} className="rounded border-border-strong" />
                  </td>
                  <td className="px-4 py-3 text-fg-tertiary text-[12px] max-w-[140px] truncate">{item.folder_name ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-primary max-w-[200px] truncate">{item.file_name}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{fmtBytes(item.size_bytes)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-fg-tertiary">
                    {item.last_modified ? new Date(item.last_modified).toLocaleDateString('el-GR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.drive_url && (
                      <a href={item.drive_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors inline-flex">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
