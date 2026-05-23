'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ChangeImpactWizard } from '../ChangeImpactWizard'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { ChangeImpact } from '../ChangeImpactWizard'

interface FilingFlowsTabProps {
  orgId: string
  setupId: string
}

interface FilingFlow {
  id: string
  flow_type: string
  path_template: string
  conditions: Record<string, unknown> | null
}

interface FormState {
  flow_type: string
  path_template: string
  conditions: string
}

const EMPTY_FORM: FormState = { flow_type: 'invoice', path_template: '', conditions: '' }

export function FilingFlowsTab({ orgId, setupId }: FilingFlowsTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FilingFlow | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [conditionsError, setConditionsError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    changeType: 'create' | 'update' | 'delete'
    entityId?: string
    payload: Record<string, unknown>
  } | null>(null)

  const { data: flows, isLoading } = useQuery({
    queryKey: ['filing_flows', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('filing_flows')
        .select('id,flow_type,path_template,conditions')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('flow_type')
      if (error) throw error
      return (data as FilingFlow[]) ?? []
    },
    staleTime: 60_000,
  })

  function openEdit(flow: FilingFlow) {
    setEditing(flow)
    setForm({ flow_type: flow.flow_type, path_template: flow.path_template, conditions: flow.conditions ? JSON.stringify(flow.conditions, null, 2) : '' })
    setConditionsError(null)
    setFormOpen(true)
  }

  function submitForm() {
    let conditions: Record<string, unknown> | null = null
    if (form.conditions.trim()) {
      try {
        conditions = JSON.parse(form.conditions)
      } catch {
        setConditionsError('Invalid JSON')
        return
      }
    }
    const payload = { flow_type: form.flow_type, path_template: form.path_template, conditions }
    setPendingAction({ changeType: editing ? 'update' : 'create', entityId: editing?.id, payload })
    setFormOpen(false)
    setWizardOpen(true)
  }

  function confirmDelete(flow: FilingFlow) {
    setPendingAction({ changeType: 'delete', entityId: flow.id, payload: { id: flow.id } })
    setWizardOpen(true)
  }

  async function applyChange() {
    if (!pendingAction) return
    const supabase = createClient()
    const { changeType, entityId, payload } = pendingAction
    if (changeType === 'create') {
      const { error } = await supabase.from('filing_flows').insert({ org_id: orgId, setup_id: setupId, ...payload })
      if (error) throw error
    } else if (changeType === 'update' && entityId) {
      const { error } = await supabase.from('filing_flows').update(payload).eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    } else if (changeType === 'delete' && entityId) {
      const { error } = await supabase.from('filing_flows').delete().eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setConditionsError(null); setFormOpen(true) }}>
          <Plus size={14} className="mr-1.5" />
          {t('common.add')}
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.flow_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.path_template')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.conditions')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
              : !flows?.length
              ? <tr><td colSpan={4} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : flows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3"><Badge variant="neutral">{flow.flow_type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-primary max-w-[240px] truncate">{flow.path_template}</td>
                    <td className="px-4 py-3 text-fg-tertiary text-[11px]">{flow.conditions ? JSON.stringify(flow.conditions).slice(0, 40) + '…' : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(flow)} className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => confirmDelete(flow)} className="p-1.5 rounded text-fg-tertiary hover:text-error hover:bg-error/5 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('common.edit') : t('common.add')} size="md">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.flow_type')} *</label>
            <select
              value={form.flow_type}
              onChange={(e) => setForm((f) => ({ ...f, flow_type: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-border text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="invoice">invoice</option>
              <option value="bank_doc">bank_doc</option>
              <option value="credit_note">credit_note</option>
              <option value="receipt">receipt</option>
            </select>
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.path_template')} *</label>
            <Input value={form.path_template} onChange={(e) => setForm((f) => ({ ...f, path_template: e.target.value }))} className="font-mono" placeholder="{company}/{year}/{flow_type}/" />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.conditions')}</label>
            <textarea
              value={form.conditions}
              onChange={(e) => { setForm((f) => ({ ...f, conditions: e.target.value })); setConditionsError(null) }}
              rows={4}
              className={`w-full rounded-lg border px-3 py-2.5 text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-none ${conditionsError ? 'border-error' : 'border-border'}`}
              placeholder='{"vat_rate": 0.24}'
            />
            {conditionsError && <p className="mt-1 text-[11px] text-error">{conditionsError}</p>}
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={submitForm} disabled={!form.flow_type || !form.path_template}>
              {t('common.preview')} →
            </Button>
          </div>
        </div>
      </Modal>

      {pendingAction && (
        <ChangeImpactWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setPendingAction(null) }}
          title={`${t('config.filing_flows')}: ${pendingAction.changeType}`}
          previewFn={() =>
            callEdge<ChangeImpact>('preview-setup-change', {
              org_id: orgId, setup_id: setupId, entity_type: 'filing_flow',
              change_type: pendingAction.changeType, entity_id: pendingAction.entityId, payload: pendingAction.payload,
            })
          }
          applyFn={applyChange}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['filing_flows', orgId, setupId] }); setPendingAction(null) }}
        />
      )}
    </div>
  )
}
