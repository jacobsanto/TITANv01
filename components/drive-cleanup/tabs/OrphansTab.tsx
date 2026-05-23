'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { ExternalLink, Archive } from 'lucide-react'
import type { CleanupItem, ScanResult } from './DuplicatesTab'

interface OrphansTabProps {
  orgId: string
  setupId: string
  scanResult: ScanResult | null
  scanning: boolean
}

function fmtBytes(b: number | null): string {
  if (b === null) return '—'
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export function OrphansTab({ orgId, setupId, scanResult, scanning }: OrphansTabProps) {
  const t = useT()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [moving, setMoving] = useState(false)

  const items = scanResult?.orphans ?? []

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

  async function handleMoveToTrash() {
    if (!selected.size) return
    setMoving(true)
    try {
      await callEdge('execute-drive-audit-action', {
        org_id: orgId,
        setup_id: setupId,
        action_type: 'move_to_trash',
        file_ids: Array.from(selected),
      })
      setSelected(new Set())
    } finally {
      setMoving(false)
    }
  }

  if (scanning) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Archive size={32} className="text-fg-tertiary animate-pulse" />
        <p className="text-small text-fg-tertiary">{t('drive.scan')}...</p>
      </div>
    )
  }

  if (!scanResult) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-fg-tertiary">
        <Archive size={32} className="opacity-40" />
        <p className="text-small">{t('drive.scan_results')} — {t('common.empty_state')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-small text-fg-secondary">
          {items.length} {t('drive.orphans').toLowerCase()}
        </span>
        {selected.size > 0 && (
          <Button variant="outline" size="sm" onClick={handleMoveToTrash} disabled={moving}>
            <Archive size={14} className="mr-1.5" />
            {moving ? t('common.loading') : `Move to Trash (${selected.size})`}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-success/5 p-8 text-center text-fg-secondary text-small">
          Δεν βρέθηκαν ορφανά αρχεία.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} className="rounded border-border-strong" />
                </th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.name')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('drive.folder_name')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('drive.size')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('drive.last_modified')}</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.file_id} className={`hover:bg-bg-alt/50 transition-colors ${selected.has(item.file_id) ? 'bg-warning/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(item.file_id)} onChange={() => toggleSelect(item.file_id)} className="rounded border-border-strong" />
                  </td>
                  <td className="px-4 py-3 text-fg-primary max-w-[220px] truncate">{item.file_name}</td>
                  <td className="px-4 py-3 text-fg-tertiary text-[12px] max-w-[160px] truncate">{item.folder_name ?? '—'}</td>
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
