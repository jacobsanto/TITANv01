'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface ExtractionPromptsTabProps {
  orgId: string
  setupId: string
}

interface ExtractionPrompt {
  id: string
  prompt_type: string
  prompt_text: string
  valid_from: string | null
  valid_until: string | null
  superseded_by: string | null
}

interface FormState {
  prompt_type: string
  prompt_text: string
  valid_from: string
  valid_until: string
}

function isActive(prompt: ExtractionPrompt): boolean {
  const now = new Date()
  if (prompt.superseded_by) return false
  if (prompt.valid_from && new Date(prompt.valid_from) > now) return false
  if (prompt.valid_until && new Date(prompt.valid_until) < now) return false
  return true
}

export function ExtractionPromptsTab({ orgId, setupId }: ExtractionPromptsTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ExtractionPrompt | null>(null)
  const [form, setForm] = useState<FormState>({ prompt_type: '', prompt_text: '', valid_from: '', valid_until: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: prompts, isLoading } = useQuery({
    queryKey: ['extraction_prompts', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('extraction_prompts')
        .select('id,prompt_type,prompt_text,valid_from,valid_until,superseded_by')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('prompt_type')
      if (error) throw error
      return (data as ExtractionPrompt[]) ?? []
    },
    staleTime: 60_000,
  })

  function openAdd() {
    setEditing(null)
    setForm({ prompt_type: '', prompt_text: '', valid_from: '', valid_until: '' })
    setDialogOpen(true)
  }

  function openEdit(p: ExtractionPrompt) {
    setEditing(p)
    setForm({
      prompt_type: p.prompt_type,
      prompt_text: p.prompt_text,
      valid_from: p.valid_from ? p.valid_from.slice(0, 10) : '',
      valid_until: p.valid_until ? p.valid_until.slice(0, 10) : '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        prompt_type: form.prompt_type,
        prompt_text: form.prompt_text,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      }
      if (editing) {
        const { error } = await supabase.from('extraction_prompts').update(payload).eq('id', editing.id).eq('org_id', orgId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('extraction_prompts').insert({ ...payload, org_id: orgId, setup_id: setupId })
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['extraction_prompts', orgId, setupId] })
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('extraction_prompts').delete().eq('id', id).eq('org_id', orgId)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['extraction_prompts', orgId, setupId] })
    } finally {
      setDeletingId(null)
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
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.prompt_type')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.prompt_text')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.valid_from')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.valid_until')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.status')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>
                ))
              : !prompts?.length
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : prompts.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg-primary font-sans font-medium">{p.prompt_type}</td>
                    <td className="px-4 py-3 text-fg-secondary max-w-[280px] truncate text-[12px]">{p.prompt_text}</td>
                    <td className="px-4 py-3 text-fg-secondary text-[12px]">{p.valid_from ? new Date(p.valid_from).toLocaleDateString('el-GR') : '—'}</td>
                    <td className="px-4 py-3 text-fg-secondary text-[12px]">{p.valid_until ? new Date(p.valid_until).toLocaleDateString('el-GR') : '—'}</td>
                    <td className="px-4 py-3"><Badge variant={isActive(p) ? 'success' : 'neutral'}>{isActive(p) ? t('common.active') : t('common.inactive')}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded text-fg-tertiary hover:text-error hover:bg-error/5 transition-colors disabled:opacity-40"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? t('common.edit') : t('common.add')} size="lg">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.prompt_type')} *</label>
            <Input value={form.prompt_type} onChange={(e) => setForm((f) => ({ ...f, prompt_type: e.target.value }))} placeholder="invoice_extraction" className="font-mono" />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.prompt_text')} *</label>
            <textarea
              value={form.prompt_text}
              onChange={(e) => setForm((f) => ({ ...f, prompt_text: e.target.value }))}
              rows={6}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-small text-fg-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-none"
              placeholder="Extract invoice fields from the document..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">{t('config.valid_from')}</label>
              <Input type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
            </div>
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">{t('config.valid_until')}</label>
              <Input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!form.prompt_type || !form.prompt_text || saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
