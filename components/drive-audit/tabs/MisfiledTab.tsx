'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FolderSearch, Wrench, ExternalLink } from 'lucide-react'

interface MisfiledTabProps {
  orgId: string
  setupId: string
}

interface MisfiledInvoice {
  invoice_id: string
  invoice_number: string | null
  current_path: string
  expected_path: string
  company_name: string
  drive_url: string | null
}

interface MisfiledResult {
  misfiled: MisfiledInvoice[]
  scanned_at: string
  total_checked: number
}

type State = 'idle' | 'scanning' | 'done' | 'fixing' | 'error'

export function MisfiledTab({ orgId, setupId }: MisfiledTabProps) {
  const t = useT()
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<MisfiledResult | null>(null)
  const [misfiled, setMisfiled] = useState<MisfiledInvoice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function handleScan() {
    setState('scanning')
    setError(null)
    try {
      const res = await callEdge<MisfiledResult>('fix-misfiled-invoices', {
        org_id: orgId,
        setup_id: setupId,
        dry_run: true,
      })
      setResult(res)
      setMisfiled(res.misfiled)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('error')
    }
  }

  async function handleFixSelected() {
    if (!selected.size) return
    setState('fixing')
    try {
      await callEdge('fix-misfiled-invoices', {
        org_id: orgId,
        setup_id: setupId,
        dry_run: false,
        invoice_ids: Array.from(selected),
      })
      setMisfiled(prev => prev.filter(m => !selected.has(m.invoice_id)))
      setSelected(new Set())
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('done')
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  function toggleAll() {
    if (selected.size === misfiled.length) setSelected(new Set())
    else setSelected(new Set(misfiled.map(m => m.invoice_id)))
  }

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div>
        <p className="text-small text-fg-secondary">
          Βρίσκει τιμολόγια που έχουν αρχειοθετηθεί σε λάθος φάκελο και τα μεταφέρει στη σωστή τοποθεσία.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={handleScan} disabled={state === 'scanning'}>
          {state === 'scanning' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <FolderSearch size={14} className="mr-1.5" />}
          {state === 'scanning' ? t('common.loading') : t('drive.scan')}
        </Button>

        {selected.size > 0 && (
          <Button variant="outline" size="sm" onClick={handleFixSelected} disabled={state === 'fixing'}>
            {state === 'fixing' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Wrench size={14} className="mr-1.5" />}
            {state === 'fixing' ? t('common.loading') : `${t('drive.fix')} (${selected.size})`}
          </Button>
        )}

        {result && (
          <span className="ml-auto text-[12px] text-fg-tertiary">
            {result.total_checked.toLocaleString('el-GR')} invoices checked
          </span>
        )}
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>}

      {state === 'done' && misfiled.length === 0 && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-8 text-center text-fg-secondary text-small">
          Όλα τα τιμολόγια είναι σωστά αρχειοθετημένα.
        </div>
      )}

      {misfiled.length > 0 && (
        <div className="rounded-xl border border-border overflow-x-auto bg-bg-surface shadow-sm">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-bg-alt border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === misfiled.length && misfiled.length > 0} onChange={toggleAll} className="rounded border-border-strong" />
                </th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('dashboard.invoice_number')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.company')}</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Current Path</th>
                <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Expected Path</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {misfiled.map((item) => (
                <tr key={item.invoice_id} className={`hover:bg-bg-alt/50 transition-colors ${selected.has(item.invoice_id) ? 'bg-warning/5' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(item.invoice_id)} onChange={() => toggleSelect(item.invoice_id)} className="rounded border-border-strong" />
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{item.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-fg-secondary max-w-[120px] truncate">{item.company_name}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-error max-w-[200px] truncate">{item.current_path}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-success max-w-[200px] truncate">{item.expected_path}</td>
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
