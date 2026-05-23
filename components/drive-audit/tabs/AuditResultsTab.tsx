'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wrench, ExternalLink, ShieldAlert } from 'lucide-react'

interface AuditResultsTabProps {
  orgId: string
  setupId: string
}

export interface AuditIssue {
  id: string
  issue_type: string
  severity: 'critical' | 'warning' | 'info'
  entity_type: string
  entity_id: string | null
  description: string
  suggested_action: string | null
  fix_payload: Record<string, unknown>
  drive_url: string | null
  fixed?: boolean
}

export interface AuditResult {
  issues: AuditIssue[]
  audited_at: string
  companies_checked: number
  files_checked: number
}

type State = 'idle' | 'auditing' | 'done' | 'error'

function severityVariant(s: string): 'error' | 'warning' | 'info' {
  if (s === 'critical') return 'error'
  if (s === 'warning') return 'warning'
  return 'info'
}

export function AuditResultsTab({ orgId, setupId }: AuditResultsTabProps) {
  const t = useT()
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [issues, setIssues] = useState<AuditIssue[]>([])

  async function handleRunAudit() {
    setState('auditing')
    setError(null)
    try {
      const res = await callEdge<AuditResult>('run-drive-audit', {
        org_id: orgId,
        setup_id: setupId,
      })
      setResult(res)
      setIssues(res.issues)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('error')
    }
  }

  async function handleFix(issue: AuditIssue) {
    setFixingId(issue.id)
    try {
      await callEdge('execute-drive-audit-action', {
        org_id: orgId,
        setup_id: setupId,
        issue_id: issue.id,
        action_type: issue.issue_type,
        ...issue.fix_payload,
      })
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, fixed: true } : i))
    } finally {
      setFixingId(null)
    }
  }

  async function handleFixAll() {
    const unfixed = issues.filter(i => !i.fixed && i.suggested_action)
    for (const issue of unfixed) {
      await handleFix(issue)
    }
  }

  const unfixedCount = issues.filter(i => !i.fixed).length
  const criticalCount = issues.filter(i => i.severity === 'critical' && !i.fixed).length

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleRunAudit}
          disabled={state === 'auditing'}
        >
          {state === 'auditing'
            ? <Loader2 size={14} className="mr-1.5 animate-spin" />
            : <ShieldAlert size={14} className="mr-1.5" />}
          {state === 'auditing' ? t('common.loading') : t('config.verify_folders')}
        </Button>

        {result && unfixedCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleFixAll}>
            <Wrench size={14} className="mr-1.5" />
            {t('drive.fix_all')} ({unfixedCount})
          </Button>
        )}

        {result && (
          <span className="ml-auto text-small text-fg-tertiary">
            {result.files_checked.toLocaleString('el-GR')} {t('common.files')} · {result.companies_checked} {t('common.companies')}
            {result.audited_at && ` · ${new Date(result.audited_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}`}
          </span>
        )}
      </div>

      {state === 'error' && (
        <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
      )}

      {state === 'auditing' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin text-fg-tertiary" />
          <p className="text-small text-fg-tertiary">{t('drive.audit_in_progress')}</p>
        </div>
      )}

      {state === 'done' && issues.length === 0 && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-8 text-center text-fg-secondary text-small">
          {t('drive.no_issues')}
        </div>
      )}

      {state === 'done' && issues.length > 0 && (
        <>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">
              <ShieldAlert size={15} />
              {criticalCount} {t('drive.critical_issues')}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`bg-bg-surface border rounded-xl p-4 flex flex-col gap-2 transition-opacity ${issue.fixed ? 'opacity-50 border-border' : 'border-border shadow-sm'}`}
              >
                <div className="flex items-start gap-3">
                  <Badge variant={severityVariant(issue.severity)} className="flex-shrink-0 mt-0.5">
                    {issue.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-small text-fg-primary font-sans font-medium">{issue.description}</p>
                    {issue.suggested_action && (
                      <p className="text-[12px] text-fg-tertiary mt-0.5">{issue.suggested_action}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {issue.drive_url && !issue.fixed && (
                      <a href={issue.drive_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    {!issue.fixed && issue.suggested_action && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFix(issue)}
                        disabled={fixingId === issue.id}
                      >
                        {fixingId === issue.id
                          ? <Loader2 size={12} className="mr-1 animate-spin" />
                          : <Wrench size={12} className="mr-1" />}
                        {t('drive.fix')}
                      </Button>
                    )}
                    {issue.fixed && (
                      <Badge variant="success">{t('common.fixed')}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-fg-tertiary">
                  <span className="font-mono">{issue.issue_type}</span>
                  {issue.entity_type && <span>{issue.entity_type}</span>}
                  {issue.entity_id && <span className="font-mono">{issue.entity_id.slice(0, 12)}…</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
