'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface ReviewQueueProps {
  orgId: string
  setupId: string
  companyId: string | null
}

interface ReviewItem {
  id: string
  created_at: string
  invoice_number: string | null
  issuer: string | null
  total_amount: number | null
  confidence: number | null
  drive_url: string | null
  original_filename: string | null
  filing_path: string | null
  company_id: string
  companies?: { name: string } | null
}

export function ReviewQueue({ orgId, setupId, companyId }: ReviewQueueProps) {
  const t = useT()
  const qc = useQueryClient()
  const [actioningId, setActioningId] = useState<string | null>(null)

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['review_queue', orgId, setupId, companyId],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('invoices')
        .select('id,created_at,invoice_number,issuer,total_amount,confidence,drive_url,original_filename,filing_path,company_id,companies(name)')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('needs_review', true)
        .order('created_at', { ascending: true })
        .limit(50)

      if (companyId) q = q.eq('company_id', companyId)

      const { data, error } = await q
      if (error) throw error
      return (data as unknown as ReviewItem[]) ?? []
    },
    staleTime: 15_000,
  })

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActioningId(id)
    try {
      await callEdge('review-item', { invoice_id: id, action })
      qc.invalidateQueries({ queryKey: ['review_queue', orgId, setupId] })
      qc.invalidateQueries({ queryKey: ['invoices', orgId, setupId] })
      qc.invalidateQueries({ queryKey: ['stat', 'invoices', orgId, setupId] })
    } finally {
      setActioningId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-bg-alt" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-fg-tertiary">{t('common.error')}</div>
    )
  }

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <CheckCircle2 size={40} className="text-success opacity-60" />
        <p className="text-fg-secondary font-sans font-medium">{t('common.empty_state')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const actioning = actioningId === item.id
        return (
          <div
            key={item.id}
            className="bg-bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.invoice_number && (
                    <span className="font-mono text-[12px] text-fg-secondary">{item.invoice_number}</span>
                  )}
                  {item.companies?.name && (
                    <Badge variant="info">{item.companies.name}</Badge>
                  )}
                  {item.confidence != null && (
                    <Badge variant={item.confidence >= 0.8 ? 'success' : item.confidence >= 0.6 ? 'warning' : 'error'}>
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-fg-primary font-sans font-medium text-body truncate">{item.issuer ?? '—'}</p>
                {item.filing_path && (
                  <p className="text-[12px] text-fg-tertiary font-mono truncate">{item.filing_path}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                {item.total_amount != null && (
                  <p className="font-sans font-bold text-fg-primary">
                    {item.total_amount.toLocaleString('el-GR', { style: 'currency', currency: 'EUR' })}
                  </p>
                )}
                <p className="text-[11px] text-fg-tertiary mt-0.5">
                  {new Date(item.created_at).toLocaleDateString('el-GR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-divider">
              {item.drive_url && (
                <a
                  href={item.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-titan-teal hover:text-primary transition-colors"
                >
                  <ExternalLink size={12} />
                  {t('common.view')}
                </a>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(item.id, 'reject')}
                  disabled={actioning}
                  className="text-error border-error/30 hover:bg-error/5"
                >
                  <XCircle size={14} className="mr-1" />
                  {t('dashboard.reject')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAction(item.id, 'approve')}
                  disabled={actioning}
                >
                  <CheckCircle2 size={14} className="mr-1" />
                  {t('dashboard.approve')}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
