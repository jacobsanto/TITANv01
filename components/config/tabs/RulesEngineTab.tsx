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

interface RulesEngineTabProps {
  orgId: string
  setupId: string
}

interface Rule {
  id: string
  name: string
  rule_type: string
  conditions: Record<string, unknown> | null
  action: string
  priority: number
  active: boolean
}

interface FormState {
  name: string
  rule_type: string
  conditions: string
  action: string
  priority: string
  active: boolean
}

const EMPTY_FORM: FormState = { name: '', rule_type: 'classification', conditions: '', action: '', priority: '0', active: true }

export function RulesEngineTab({ orgId, setupId }: RulesEngineTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [conditionsError, setConditionsError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    changeType: 'create' | 'update' | 'delete'
    entityId?: string
    payload: Record<string, unknown>
  } | null>(null)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['rules_engine', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('rules_engine')
        .select('id,name,rule_type,conditions,action,priority,active')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('priority', { ascending: false })
      if (error) throw error
      return (data as Rule[]) ?? []
    },
    staleTime: 60_000,
  })

  function openEdit(rule: Rule) {
    setEditing(rule)
    setForm({ name: rule.name, rule_type: rule.rule_type, conditions: rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '', action: rule.action, priority: String(rule.priority), active: rule.active })
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
    const payload = { name: form.name, rule_type: form.rule_type, conditions, action: form.action, priority: Number(form.priority), active: form.active }
    setPendingAction({ changeType: editing ? 'update' : 'create', entityId: editing?.id, payload })
    setFormOpen(false)
    setWizardOpen(true)
  }

  function confirmDelete(rule: Rule) {
    setPendingAction({ changeType: 'delete', entityId: rule.id, payload: { id: rule.id } })
    setWizardOpen(true)
  }

  async function applyChange() {
    if (!pendingAction) return
    const supabase = createClient()
    const { changeType, entityId, payload } = pendingAction
    if (changeType === 'create') {
      const { error } = await supabase.from('rules_engine').insert({ org_id: orgId, setup_id: setupId, ...payload })
      if (error) throw error
    } else if (changeType === 'update' && entityId) {
      const { error } = await supabase.from('rules_engine').update(payload).eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    } else if (changeType === 'delete' && entityId) {
      const { error } = await supabase.from('rules_engine').delete().eq('id', entityId).eq('org_id', orgId)
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
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.name')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.rule_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Action</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">Priority</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.status')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
              : !rules?.length
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg-primary font-sans font-medium">{rule.name}</td>
                    <td className="px-4 py-3"><Badge variant="neutral">{rule.rule_type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary max-w-[160px] truncate">{rule.action}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{rule.priority}</td>
                    <td className="px-4 py-3"><Badge variant={rule.active ? 'success' : 'neutral'}>{rule.active ? t('common.active') : t('common.inactive')}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(rule)} className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => confirmDelete(rule)} className="p-1.5 rounded text-fg-tertiary hover:text-error hover:bg-error/5 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('common.edit') : t('common.add')} size="md">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-small text-fg-secondary mb-1.5">{t('common.name')} *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">{t('config.rule_type')} *</label>
              <select value={form.rule_type} onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-border text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="classification">classification</option>
                <option value="routing">routing</option>
                <option value="validation">validation</option>
                <option value="enrichment">enrichment</option>
              </select>
            </div>
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">Priority</label>
              <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">Action *</label>
            <Input value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))} className="font-mono" placeholder="file_to:invoices/{{company}}" />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.conditions')}</label>
            <textarea
              value={form.conditions}
              onChange={(e) => { setForm((f) => ({ ...f, conditions: e.target.value })); setConditionsError(null) }}
              rows={3}
              className={`w-full rounded-lg border px-3 py-2.5 text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-none ${conditionsError ? 'border-error' : 'border-border'}`}
              placeholder='{"document_type": "invoice"}'
            />
            {conditionsError && <p className="mt-1 text-[11px] text-error">{conditionsError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="rule-active" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-border-strong" />
            <label htmlFor="rule-active" className="text-small text-fg-secondary">{t('common.active')}</label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={submitForm} disabled={!form.name || !form.action}>
              {t('common.preview')} →
            </Button>
          </div>
        </div>
      </Modal>

      {pendingAction && (
        <ChangeImpactWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setPendingAction(null) }}
          title={`${t('config.rules_engine')}: ${pendingAction.changeType}`}
          previewFn={() =>
            callEdge<ChangeImpact>('preview-setup-change', {
              org_id: orgId, setup_id: setupId, entity_type: 'rule',
              change_type: pendingAction.changeType, entity_id: pendingAction.entityId, payload: pendingAction.payload,
            })
          }
          applyFn={applyChange}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['rules_engine', orgId, setupId] }); setPendingAction(null) }}
        />
      )}
    </div>
  )
}
