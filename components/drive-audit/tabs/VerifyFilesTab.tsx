'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react'

interface VerifyFilesTabProps {
  orgId: string
  setupId: string
}

interface CompanyVerification {
  company_id: string
  company_name: string
  status: 'ok' | 'missing_folder' | 'missing_files' | 'permission_error'
  folder_id: string | null
  drive_url: string | null
  issues: string[]
  files_checked: number
  files_ok: number
}

interface VerifyResult {
  companies: CompanyVerification[]
  verified_at: string
  total_companies: number
  ok_count: number
  issue_count: number
}

type State = 'idle' | 'verifying' | 'done' | 'error'

function statusVariant(s: string): 'success' | 'error' | 'warning' | 'info' {
  if (s === 'ok') return 'success'
  if (s === 'missing_folder' || s === 'permission_error') return 'error'
  return 'warning'
}

function statusLabel(s: string, t: (k: string) => string): string {
  if (s === 'ok') return t('common.success')
  if (s === 'missing_folder') return 'Missing folder'
  if (s === 'missing_files') return 'Missing files'
  if (s === 'permission_error') return 'Permission error'
  return s
}

export function VerifyFilesTab({ orgId, setupId }: VerifyFilesTabProps) {
  const t = useT()
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setState('verifying')
    setError(null)
    try {
      const res = await callEdge<VerifyResult>('verify-company-files', {
        org_id: orgId,
        setup_id: setupId,
      })
      setResult(res)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('error')
    }
  }

  const companies = result?.companies ?? []
  const issueCompanies = companies.filter(c => c.status !== 'ok')
  const okCompanies = companies.filter(c => c.status === 'ok')

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div>
        <p className="text-small text-fg-secondary">
          Ελέγχει ότι κάθε εταιρεία έχει τους σωστούς φακέλους Drive και τα αρχεία είναι προσβάσιμα.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={handleVerify} disabled={state === 'verifying'}>
          {state === 'verifying'
            ? <Loader2 size={14} className="mr-1.5 animate-spin" />
            : <ShieldCheck size={14} className="mr-1.5" />}
          {state === 'verifying' ? t('common.loading') : t('config.verify_folders')}
        </Button>

        {result && (
          <span className="ml-auto text-[12px] text-fg-tertiary">
            {result.ok_count}/{result.total_companies} companies OK
            {result.verified_at && ` · ${new Date(result.verified_at).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })}`}
          </span>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
      )}

      {state === 'verifying' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 size={28} className="animate-spin text-fg-tertiary" />
          <p className="text-small text-fg-tertiary">Επαλήθευση αρχείων εταιρειών...</p>
        </div>
      )}

      {state === 'done' && companies.length === 0 && (
        <div className="rounded-xl border border-border bg-bg-surface p-8 text-center text-fg-tertiary text-small">
          Δεν βρέθηκαν εταιρείες.
        </div>
      )}

      {state === 'done' && companies.length > 0 && (
        <>
          {result && result.issue_count === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/5 border border-success/20 text-success text-small">
              <CheckCircle2 size={15} />
              Όλες οι εταιρείες έχουν σωστή δομή φακέλων.
            </div>
          )}

          {result && result.issue_count > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-warning/5 border border-warning/20 text-warning text-small">
              <AlertTriangle size={15} />
              {result.issue_count} {result.issue_count === 1 ? 'εταιρεία' : 'εταιρείες'} με προβλήματα
            </div>
          )}

          {issueCompanies.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-fg-tertiary uppercase tracking-wider">Προβλήματα</p>
              {issueCompanies.map((company) => (
                <div
                  key={company.company_id}
                  className="bg-bg-surface border border-border rounded-xl p-4 flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant={statusVariant(company.status)} className="flex-shrink-0 mt-0.5">
                      {statusLabel(company.status, t)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-fg-primary font-sans font-medium">{company.company_name}</p>
                      {company.issues.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5">
                          {company.issues.map((issue, idx) => (
                            <li key={idx} className="text-[12px] text-fg-tertiary">· {issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {company.drive_url && (
                        <a
                          href={company.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors inline-flex"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                  {company.files_checked > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-fg-tertiary">
                      <span>{company.files_ok}/{company.files_checked} files OK</span>
                      {company.folder_id && <span className="font-mono">{company.folder_id.slice(0, 12)}…</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {okCompanies.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
              <table className="w-full text-small">
                <thead>
                  <tr className="bg-bg-alt border-b border-border">
                    <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                    <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Files</th>
                    <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.status')}</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {okCompanies.map((company) => (
                    <tr key={company.company_id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3 text-fg-primary">{company.company_name}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{company.files_ok}/{company.files_checked}</td>
                      <td className="px-4 py-3">
                        <Badge variant="success">{t('common.success')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {company.drive_url && (
                          <a
                            href={company.drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors inline-flex"
                          >
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
        </>
      )}
    </div>
  )
}
