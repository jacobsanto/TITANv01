'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface InviteModalProps {
  open: boolean
  onClose: () => void
  orgId: string
  onSuccess: () => void
}

type Role = 'admin' | 'member'

export function InviteModal({ open, onClose, orgId, onSuccess }: InviteModalProps) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setEmail('')
    setRole('member')
    setError(null)
    onClose()
  }

  async function handleInvite() {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('common.error'))

      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          org_id: orgId,
          email: email.trim().toLowerCase(),
          role,
          invited_by: user.id,
        })

      if (inviteError) throw inviteError
      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('members.invite_member')} size="sm">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[11px] text-fg-tertiary mb-1.5">{t('common.email')}</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
        </div>

        <div>
          <label className="block text-[11px] text-fg-tertiary mb-1.5">{t('members.role')}</label>
          <div className="flex gap-2">
            {(['admin', 'member'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 px-3 py-2 rounded-lg text-small border transition-colors ${
                  role === r
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-bg-surface text-fg-secondary border-border hover:border-border-strong'
                }`}
              >
                {t(`members.${r}`)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" onClick={handleInvite} disabled={!email.trim() || loading}>
            {loading && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            {t('members.invite')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
