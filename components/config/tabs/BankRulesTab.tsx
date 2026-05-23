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

interface BankRulesTabProps {
  orgId: string
  setupId: string
}

interface BankRule {
  id: string
  account_last8: string | null
  bank_name: string | null
  account_type: string | null
  iban: string | null
  rule_type: string
}

interface FormState {
  account_last8: string
  bank_name: string
  account_type: string
  iban: string
  rule_type: string
}

const EMPTY_FORM: FormState = { account_last8: '', bank_name: '', account_type: '', iban: '', rule_type: 'match' }

export function BankRulesTab({ orgId, setupId }: BankRulesTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BankRule | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    changeType: 'create' | 'update' | 'delete'
    entityId?: string
    payload: Record<string, unknown>
  } | null>(null)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['bank_rules', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bank_rules')
        .select('id,account_last8,bank_name,account_type,iban,rule_type')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('bank_name')
      if (error) throw error
      return (data as BankRule[]) ?? []
    },
    staleTime: 60_000,
  })

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(rule: BankRule) {
    setEditing(rule)
    setForm({ account_last8: rule.account_last8 ?? '', bank_name: rule.bank_name ?? '', account_type: rule.account_type ?? '', iban: rule.iban ?? '', rule_type: rule.rule_type })
    setFormOpen(true)
  }

  function submitForm() {
    const payload = {
      account_last8: form.account_last8 || null,
      bank_name: form.bank_name || null,
      account_type: form.account_type || null,
      iban: form.iban || null,
      rule_type: form.rule_type,
    }
    setPendingAction({
      changeType: editing ? 'update' : 'create',
      entityId: editing?.id,
      payload,
    })
    setFormOpen(false)
    setWizardOpen(true)
  }

  function confirmDelete(rule: BankRule) {
    setPendingAction({
      changeType: 'delete',
      entityId: rule.id,
      payload: { id: rule.id },
    })
    setWizardOpen(true)
  }

  async function applyChange() {
    if (!pendingAction) return
    const supabase = createClient()
    const { changeType, entityId, payload } = pendingAction

    if (changeType === 'create') {
      const { error } = await supabase.from('bank_rules').insert({ org_id: orgId, setup_id: setupId, ...payload })
      if (error) throw error
    } else if (changeType === 'update' && entityId) {
      const { error } = await supabase.from('bank_rules').update(payload).eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    } else if (changeType === 'delete' && entityId) {
      const { error } = await supabase.from('bank_rules').delete().eq('id', entityId).eq('org_id', orgId)
      if (error) throw error
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={14} className="mr-1.5" />
          {t('common.add')}
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.bank_name')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.account_last8')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.iban')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.rule_type')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>)
              : !rules?.length
              ? <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg-primary font-sans font-medium">{rule.bank_name ?? '—'}</td>
                    <td className="px-4 py-3 text-fg-secondary font-mono text-[12px]">{rule.account_last8 ?? '—'}</td>
                    <td className="px-4 py-3 text-fg-secondary font-mono text-[12px]">{rule.iban ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant="info">{rule.rule_type}</Badge></td>
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? t('common.edit') : t('common.add')} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.bank_name')}</label>
            <Input value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">{t('config.account_last8')}</label>
              <Input value={form.account_last8} onChange={(e) => setForm((f) => ({ ...f, account_last8: e.target.value }))} className="font-mono" maxLength={8} />
            </div>
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">{t('config.account_type')}</label>
              <Input value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.iban')}</label>
            <Input value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} className="font-mono" placeholder="GR00 0000 0000 0000 0000 0000 000" />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.rule_type')} *</label>
            <select
              value={form.rule_type}
              onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-border text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="match">match</option>
              <option value="exclude">exclude</option>
              <option value="auto_file">auto_file</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={submitForm} disabled={!form.rule_type}>
              {t('common.preview')} →
            </Button>
          </div>
        </div>
      </Modal>

      {pendingAction && (
        <ChangeImpactWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setPendingAction(null) }}
          title={`${t('config.bank_rules')}: ${pendingAction.changeType}`}
          previewFn={() =>
            callEdge<ChangeImpact>('preview-setup-change', {
              org_id: orgId,
              setup_id: setupId,
              entity_type: 'bank_rule',
              change_type: pendingAction.changeType,
              entity_id: pendingAction.entityId,
              payload: pendingAction.payload,
            })
          }
          applyFn={applyChange}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['bank_rules', orgId, setupId] })
            setPendingAction(null)
          }}
        />
      )}
    </div>
  )
}
