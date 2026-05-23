'use client'

import { useState } from 'react'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface HandoverModalProps {
  open: boolean
  onClose: () => void
  orgId: string
  setupId: string
  targetUserId: string
  targetEmail: string
}

type Step = 'warn' | 'confirm' | 'applying' | 'done'

export function HandoverModal({ open, onClose, orgId, setupId, targetUserId, targetEmail }: HandoverModalProps) {
  const t = useT()
  const [step, setStep] = useState<Step>('warn')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setStep('warn')
    setConfirmText('')
    setError(null)
    onClose()
  }

  async function handleApply() {
    if (confirmText !== 'CONFIRM') return
    setStep('applying')
    setError(null)
    try {
      await callEdge('handover-super-admin', {
        org_id: orgId,
        setup_id: setupId,
        new_super_admin_user_id: targetUserId,
      })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setStep('confirm')
    }
  }

  return (
    <Modal open={open} onClose={step === 'done' ? handleClose : handleClose} title={t('members.handover.title')} size="sm">
      {step === 'warn' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-error/5 border border-error/20">
            <AlertTriangle size={18} className="text-error flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-small font-sans font-semibold text-error">{t('members.handover.warning')}</p>
              <p className="text-[12px] text-fg-secondary">{t('members.handover.description')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-small text-fg-secondary">
            <p className="font-sans font-medium text-fg-primary">{t('members.handover.consequences')}</p>
            <ul className="flex flex-col gap-1 pl-4">
              <li className="list-disc">{t('members.handover.immediate_logout')}</li>
              <li className="list-disc">{t('members.handover.no_recovery')}</li>
            </ul>
          </div>

          <div className="text-small text-fg-secondary">
            <span>{t('members.handover.new_admin')}: </span>
            <span className="font-mono text-fg-primary">{targetEmail}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={() => setStep('confirm')}>
              {t('members.handover.confirm_step1')}
            </Button>
          </div>
        </div>
      )}

      {(step === 'confirm' || step === 'applying') && (
        <div className="flex flex-col gap-4">
          <p className="text-small text-fg-secondary">
            {t('members.handover.type_confirm')}
          </p>

          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="CONFIRM"
            className="font-mono"
            autoFocus
          />

          {error && (
            <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={step === 'applying'}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={confirmText !== 'CONFIRM' || step === 'applying'}
            >
              {step === 'applying' && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {t('members.handover.confirm_step2')}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-4 text-center py-4">
          <p className="text-small text-fg-secondary">
            Η μεταβίβαση ολοκληρώθηκε. Θα αποσυνδεθείτε αυτόματα.
          </p>
          <Button variant="primary" size="sm" onClick={handleClose}>{t('common.close')}</Button>
        </div>
      )}
    </Modal>
  )
}
