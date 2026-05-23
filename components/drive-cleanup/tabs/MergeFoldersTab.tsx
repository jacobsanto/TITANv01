'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FolderInput, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface MergeFoldersTabProps {
  orgId: string
  setupId: string
}

type State = 'idle' | 'merging' | 'success' | 'error'

interface MergeEntry {
  source_folder_id: string
  target_folder_id: string
}

export function MergeFoldersTab({ orgId, setupId }: MergeFoldersTabProps) {
  const t = useT()
  const [entries, setEntries] = useState<MergeEntry[]>([{ source_folder_id: '', target_folder_id: '' }])
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ merged_files: number } | null>(null)

  function updateEntry(i: number, field: keyof MergeEntry, value: string) {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  function addEntry() {
    setEntries(prev => [...prev, { source_folder_id: '', target_folder_id: '' }])
  }

  function removeEntry(i: number) {
    setEntries(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleMerge() {
    const validEntries = entries.filter(e => e.source_folder_id.trim() && e.target_folder_id.trim())
    if (!validEntries.length) return

    setState('merging')
    setError(null)
    setResult(null)

    try {
      const res = await callEdge<{ merged_files: number }>('merge-drive-folders', {
        org_id: orgId,
        setup_id: setupId,
        merges: validEntries,
      })
      setResult(res)
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('error')
    }
  }

  const canMerge = entries.some(e => e.source_folder_id.trim() && e.target_folder_id.trim())

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div>
        <h3 className="font-sans font-semibold text-fg-primary mb-1">{t('drive.merge_folders')}</h3>
        <p className="text-small text-fg-secondary">
          Μεταφέρει το περιεχόμενο των φακέλων προέλευσης στους φακέλους προορισμού.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div key={i} className="bg-bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-fg-tertiary uppercase tracking-wider">Merge {i + 1}</span>
              {entries.length > 1 && (
                <button onClick={() => removeEntry(i)} className="text-[11px] text-fg-tertiary hover:text-error transition-colors">
                  {t('common.remove')}
                </button>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-fg-tertiary mb-1">Source Folder ID</label>
              <Input
                value={entry.source_folder_id}
                onChange={(e) => updateEntry(i, 'source_folder_id', e.target.value)}
                className="font-mono"
                placeholder="Google Drive Folder ID (source)"
              />
            </div>
            <div className="flex items-center gap-2 text-fg-tertiary text-[12px]">
              <FolderInput size={14} />
              <span>→</span>
            </div>
            <div>
              <label className="block text-[11px] text-fg-tertiary mb-1">Target Folder ID</label>
              <Input
                value={entry.target_folder_id}
                onChange={(e) => updateEntry(i, 'target_folder_id', e.target.value)}
                className="font-mono"
                placeholder="Google Drive Folder ID (target)"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={addEntry} className="text-small text-primary hover:text-primary/80 transition-colors">
          + {t('common.add')} merge
        </button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleMerge}
          disabled={!canMerge || state === 'merging'}
          className="ml-auto"
        >
          {state === 'merging' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FolderInput size={14} className="mr-1.5" />}
          {state === 'merging' ? t('common.loading') : t('drive.merge_folders')}
        </Button>
      </div>

      {state === 'success' && result && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/5 border border-success/20 text-success text-small">
          <CheckCircle2 size={16} />
          Ολοκληρώθηκε — {result.merged_files} αρχεία μεταφέρθηκαν.
        </div>
      )}

      {state === 'error' && error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
    </div>
  )
}
