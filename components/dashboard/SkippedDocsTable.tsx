'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { ExternalLink, RotateCcw } from 'lucide-react'

interface SkippedDocsTableProps {
  orgId: string
  setupId: string
  companyId: string | null
}

interface SkippedDoc {
  id: string
  created_at: string
  original_filename: string | null
  reason: string | null
  drive_url: string | null
  company_id: string
  companies?: { name: string } | null
}

export function SkippedDocsTable({ orgId, setupId, companyId }: SkippedDocsTableProps) {
  const t = useT()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [restoring, setRestoring] = useState(false)

  const { data: docs, isLoading, error } = useQuery({
    queryKey: ['skipped_docs', orgId, setupId, companyId],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('skipped_docs')
        .select('id,created_at,original_filename,reason,drive_url,company_id,companies(name)')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (companyId) q = q.eq('company_id', companyId)

      const { data, error } = await q
      if (error) throw error
      return (data as unknown as SkippedDoc[]) ?? []
    },
    staleTime: 30_000,
  })

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!docs) return
    if (selected.size === docs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(docs.map((d) => d.id)))
    }
  }

  async function handleRestore() {
    if (selected.size === 0) return
    setRestoring(true)
    try {
      await callEdge('bulk-restore-skipped-docs', {
        skipped_doc_ids: Array.from(selected),
        org_id: orgId,
        setup_id: setupId,
      })
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['skipped_docs', orgId, setupId] })
      qc.invalidateQueries({ queryKey: ['stat', 'skipped_docs', orgId, setupId] })
    } finally {
      setRestoring(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-bg-alt" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-fg-tertiary">{t('common.error')}</div>
  }

  if (!docs?.length) {
    return (
      <div className="text-center py-16 text-fg-tertiary">{t('common.empty_state')}</div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-small text-fg-tertiary">
          {docs.length} {t('dashboard.skipped_docs').toLowerCase()}
        </span>
        {selected.size > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleRestore}
            disabled={restoring}
          >
            <RotateCcw size={14} className={`mr-1.5 ${restoring ? 'animate-spin' : ''}`} />
            {t('dashboard.restore')} ({selected.size})
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-x-auto bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === docs.length && docs.length > 0}
                  onChange={toggleAll}
                  className="rounded border-border-strong"
                />
              </th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.date')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.original_filename')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.reason')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {docs.map((doc) => (
              <tr key={doc.id} className={`hover:bg-bg-alt/50 transition-colors ${selected.has(doc.id) ? 'bg-accent/5' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    className="rounded border-border-strong"
                  />
                </td>
                <td className="px-4 py-3 text-fg-secondary font-mono text-[12px]">
                  {new Date(doc.created_at).toLocaleDateString('el-GR')}
                </td>
                <td className="px-4 py-3 text-fg-primary max-w-[200px] truncate">
                  {doc.original_filename ?? '—'}
                </td>
                <td className="px-4 py-3 text-fg-secondary max-w-[120px] truncate">
                  {doc.companies?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-fg-tertiary max-w-[160px] truncate text-[12px]">
                  {doc.reason ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {doc.drive_url && (
                      <a
                        href={doc.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
