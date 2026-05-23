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

interface NamingRulesTabProps {
  orgId: string
  setupId: string
}

interface NamingRule {
  id: string
  rule_type: string
  pattern_template: string
  prefix: string | null
}

interface FormState {
  rule_type: string
  pattern_template: string
  prefix: string
}

const EMPTY_FORM: FormState = { rule_type: 'invoice', pattern_template: '', prefix: '' }

export function NamingRulesTab({ orgId, setupId }: NamingRulesTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<NamingRule | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    changeType: 'create' | 'update' | 'delete'
    entityId?: string
    payload: Record<string, unknown>
  } | null>(null)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['naming_rules', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('naming_rules')
        .select('id,rule_type,pattern_template,prefix')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('rule_type')
      if (error) throw error
      return (data as NamingRule[]) ?? []
    },
    staleTime: 60_000,
  })

  function openEdit(rule: NamingRule) {
    setEditing(rule)
    setForm({ rule_type: rule.rule_type, pattern_template: rule.pattern_template, prefix: rule.prefix ?? '' })
    setFormOpen(true)
  }

  function submitForm() {
    const payload = { rule_type: form.rule_type, pattern_template: form.pattern_template, prefix: form.prefix || null }
    setPendingAction({ changeType: editing ? 'update' : 'create', entityId: editing?.id, payload })
    setFormOpen(false)
    setWizardOpen(true)
  }

  function confirmDelete(rule: NamingRule) {
    setPendingAction({ changeType: 'delete', entityId: rule.id, payload: { id: rule.id } })
    setWizardOpen(true)
  }

  async function applyChange() {
    if (!pendingAction) return
    const supabase = createClient()
    const { changeType, entityId, payload } = pendingAction
    if (changeType === 'create') {
      const { error } = await supabase.from('naming_rules').insert({ org_id: orgId, setup_id: setupId, ...payload })
      if (error) throw error
    } else if (changeType === 'update' && entityId) {
      const { error } = await supabase.from('naming_rules').update(payload).eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    } else if (changeType === 'delete' && entityId) {
      const { error } = await supabase.from('naming_rules').delete().eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true) }}>
          <Plus size={14} className="mr-1.5" />
          {t('common.add')}
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.rule_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.pattern_template')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.prefix')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
              : !rules?.length
              ? <tr><td colSpan={4} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3"><Badge variant="info">{rule.rule_type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-primary max-w-[280px] truncate">{rule.pattern_template}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-fg-secondary">{rule.prefix ?? '—'}</td>
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
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.rule_type')} *</label>
            <select
              value={form.rule_type}
              onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-border text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="invoice">invoice</option>
              <option value="bank_doc">bank_doc</option>
              <option value="credit_note">credit_note</option>
              <option value="receipt">receipt</option>
            </select>
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.pattern_template')} *</label>
            <Input value={form.pattern_template} onChange={(e) => setForm((f) => ({ ...f, pattern_template: e.target.value }))} className="font-mono" placeholder="{year}/{month}/{issuer}_{invoice_number}" />
            <p className="mt-1 text-[11px] text-fg-tertiary">Tokens: {'{year}'} {'{month}'} {'{day}'} {'{issuer}'} {'{invoice_number}'} {'{mark_number}'} {'{company}'}</p>
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.prefix')}</label>
            <Input value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))} className="font-mono" placeholder="INV-" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={submitForm} disabled={!form.rule_type || !form.pattern_template}>
              {t('common.preview')} →
            </Button>
          </div>
        </div>
      </Modal>

      {pendingAction && (
        <ChangeImpactWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setPendingAction(null) }}
          title={`${t('config.naming_rules')}: ${pendingAction.changeType}`}
          previewFn={() =>
            callEdge<ChangeImpact>('preview-setup-change', {
              org_id: orgId, setup_id: setupId, entity_type: 'naming_rule',
              change_type: pendingAction.changeType, entity_id: pendingAction.entityId, payload: pendingAction.payload,
            })
          }
          applyFn={applyChange}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['naming_rules', orgId, setupId] }); setPendingAction(null) }}
        />
      )}
    </div>
  )
}
