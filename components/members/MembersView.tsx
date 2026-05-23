'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InviteModal } from './InviteModal'
import { HandoverModal } from './HandoverModal'
import { Loader2, UserPlus, Shield, Trash2 } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: 'super_admin' | 'admin' | 'member'
  joined_at: string
  profiles: { email: string; display_name: string | null } | null
}

function roleBadgeVariant(role: string): 'error' | 'warning' | 'info' {
  if (role === 'super_admin') return 'error'
  if (role === 'admin') return 'warning'
  return 'info'
}

function roleLabel(role: string, t: (k: string) => string): string {
  if (role === 'super_admin') return t('members.super_admin')
  if (role === 'admin') return t('members.admin')
  return t('members.member')
}

export function MembersView() {
  const t = useT()
  const { orgId, setupId, loading: orgLoading, error: orgError } = useOrg()
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [handoverTarget, setHandoverTarget] = useState<Member | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, joined_at, profiles(email, display_name)')
        .eq('org_id', orgId)
        .order('joined_at', { ascending: true })

      if (fetchError) throw fetchError
      const rows = (data ?? []) as unknown as Member[]
      setMembers(rows)
      const me = rows.find(m => m.user_id === user?.id)
      setCurrentRole(me?.role ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => {
    if (orgId) fetchMembers()
  }, [orgId, fetchMembers])

  async function handleRemove(member: Member) {
    if (!orgId) return
    setRemovingId(member.id)
    try {
      const supabase = createClient()
      const { error: removeError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.id)
        .eq('org_id', orgId)
      if (removeError) throw removeError
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setRemovingId(null)
    }
  }

  async function handleRoleChange(member: Member, newRole: 'admin' | 'member') {
    if (!orgId) return
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', member.id)
        .eq('org_id', orgId)
      if (updateError) throw updateError
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  if (orgLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 size={32} className="animate-spin text-fg-tertiary" /></div>
  if (orgError || !orgId || !setupId) return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{orgError ?? t('common.error')}</div>

  const isSuperAdmin = currentRole === 'super_admin'
  const isAdmin = currentRole === 'admin' || isSuperAdmin

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('members.title')}</h1>
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus size={14} className="mr-1.5" />
            {t('members.invite')}
          </Button>
        )}
      </div>

      <div className="flex-1 p-6 max-w-3xl">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-fg-tertiary" /></div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-bg-surface shadow-sm">
            <table className="w-full text-small">
              <thead>
                <tr className="bg-bg-alt border-b border-border">
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('common.user')}</th>
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('members.role')}</th>
                  <th className="text-left px-4 py-3 text-fg-tertiary font-sans font-medium text-[11px] uppercase tracking-wider">{t('members.joined_at')}</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const isMe = member.user_id === currentUserId
                  const isMemberSuperAdmin = member.role === 'super_admin'
                  const canEdit = isAdmin && !isMe && !isMemberSuperAdmin
                  const canHandover = isSuperAdmin && !isMe && !isMemberSuperAdmin

                  return (
                    <tr key={member.id} className="hover:bg-bg-alt/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-fg-primary font-sans font-medium">
                            {member.profiles?.display_name ?? member.profiles?.email ?? '—'}
                            {isMe && <span className="ml-1.5 text-[10px] text-fg-tertiary">(you)</span>}
                          </span>
                          {member.profiles?.display_name && (
                            <span className="text-[12px] text-fg-tertiary">{member.profiles.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value as 'admin' | 'member')}
                            className="text-small bg-bg-surface border border-border rounded-lg px-2 py-1 text-fg-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="admin">{t('members.admin')}</option>
                            <option value="member">{t('members.member')}</option>
                          </select>
                        ) : (
                          <Badge variant={roleBadgeVariant(member.role)}>
                            {roleLabel(member.role, t)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-fg-tertiary">
                        {new Date(member.joined_at).toLocaleDateString('el-GR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canHandover && (
                            <button
                              onClick={() => setHandoverTarget(member)}
                              className="p-1.5 rounded text-fg-tertiary hover:text-warning hover:bg-bg-alt transition-colors"
                              title={t('members.handover.title')}
                            >
                              <Shield size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleRemove(member)}
                              disabled={removingId === member.id}
                              className="p-1.5 rounded text-fg-tertiary hover:text-error hover:bg-bg-alt transition-colors disabled:opacity-50"
                              title={t('common.delete')}
                            >
                              {removingId === member.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        orgId={orgId}
        onSuccess={fetchMembers}
      />

      {handoverTarget && (
        <HandoverModal
          open={!!handoverTarget}
          onClose={() => setHandoverTarget(null)}
          orgId={orgId}
          setupId={setupId}
          targetUserId={handoverTarget.user_id}
          targetEmail={handoverTarget.profiles?.email ?? ''}
        />
      )}
    </div>
  )
}
