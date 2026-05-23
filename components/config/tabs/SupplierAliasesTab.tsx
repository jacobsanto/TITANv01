'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

interface SupplierAliasesTabProps {
  orgId: string
  setupId: string
}

interface SupplierAlias {
  id: string
  canonical_name: string
  alias_name: string
  afm: string | null
}

interface FormState {
  canonical_name: string
  alias_name: string
  afm: string
}

export function SupplierAliasesTab({ orgId, setupId }: SupplierAliasesTabProps) {
  const t = useT()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierAlias | null>(null)
  const [form, setForm] = useState<FormState>({ canonical_name: '', alias_name: '', afm: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: aliases, isLoading } = useQuery({
    queryKey: ['supplier_aliases', orgId, setupId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('supplier_aliases')
        .select('id,canonical_name,alias_name,afm')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .order('canonical_name')
      if (error) throw error
      return (data as SupplierAlias[]) ?? []
    },
    staleTime: 60_000,
  })

  function openAdd() {
    setEditing(null)
    setForm({ canonical_name: '', alias_name: '', afm: '' })
    setDialogOpen(true)
  }

  function openEdit(alias: SupplierAlias) {
    setEditing(alias)
    setForm({ canonical_name: alias.canonical_name, alias_name: alias.alias_name, afm: alias.afm ?? '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      if (editing) {
        const { error } = await supabase
          .from('supplier_aliases')
          .update({ canonical_name: form.canonical_name, alias_name: form.alias_name, afm: form.afm || null })
          .eq('id', editing.id)
          .eq('org_id', orgId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('supplier_aliases')
          .insert({ org_id: orgId, setup_id: setupId, canonical_name: form.canonical_name, alias_name: form.alias_name, afm: form.afm || null })
        if (error) throw error
      }
      qc.invalidateQueries({ queryKey: ['supplier_aliases', orgId, setupId] })
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('supplier_aliases')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['supplier_aliases', orgId, setupId] })
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = (aliases ?? []).filter(
    (a) =>
      a.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
      a.alias_name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} className="pl-8 h-9 text-small" />
        </div>
        <Button variant="primary" size="sm" onClick={openAdd} className="ml-auto">
          <Plus size={14} className="mr-1.5" />
          {t('common.add')}
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
        <table className="w-full text-small">
          <thead>
            <tr className="bg-bg-alt border-b border-border">
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.canonical_name')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.alias_name')}</th>
              <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('config.afm')}</th>
              <th className="text-right px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-bg-alt w-3/4" /></td>)}</tr>
                ))
              : filtered.length === 0
              ? <tr><td colSpan={4} className="px-4 py-8 text-center text-fg-tertiary">{t('common.empty_state')}</td></tr>
              : filtered.map((alias) => (
                  <tr key={alias.id} className="hover:bg-bg-alt/50 transition-colors">
                    <td className="px-4 py-3 text-fg-primary font-sans font-medium">{alias.canonical_name}</td>
                    <td className="px-4 py-3 text-fg-secondary">{alias.alias_name}</td>
                    <td className="px-4 py-3 text-fg-secondary font-mono text-[12px]">{alias.afm ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(alias)} className="p-1.5 rounded text-fg-tertiary hover:text-primary hover:bg-bg-alt transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(alias.id)} disabled={deletingId === alias.id} className="p-1.5 rounded text-fg-tertiary hover:text-error hover:bg-error/5 transition-colors disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? t('common.edit') : t('common.add')} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.canonical_name')} *</label>
            <Input value={form.canonical_name} onChange={(e) => setForm((f) => ({ ...f, canonical_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.alias_name')} *</label>
            <Input value={form.alias_name} onChange={(e) => setForm((f) => ({ ...f, alias_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-small text-fg-secondary mb-1.5">{t('config.afm')}</label>
            <Input value={form.afm} onChange={(e) => setForm((f) => ({ ...f, afm: e.target.value }))} className="font-mono" mono />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!form.canonical_name || !form.alias_name || saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
