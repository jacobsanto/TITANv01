'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n/utils'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

export interface ChangeImpact {
  documents_affected: number
  companies_affected: number
  estimated_time_seconds?: number
  current_value?: string | null
  new_value?: string | null
  warnings?: string[]
}

interface ChangeImpactWizardProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  previewFn: () => Promise<ChangeImpact>
  applyFn: () => Promise<void>
  onSuccess: () => void
}

type State = 'loading' | 'preview' | 'applying' | 'error'

export function ChangeImpactWizard({
  open,
  onClose,
  title,
  description,
  previewFn,
  applyFn,
  onSuccess,
}: ChangeImpactWizardProps) {
  const t = useT()
  const [state, setState] = useState<State>('loading')
  const [impact, setImpact] = useState<ChangeImpact | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setConfirmText('')
      setError(null)
      setImpact(null)
      setState('loading')
      return
    }

    setState('loading')
    previewFn()
      .then((data) => {
        setImpact(data)
        setState('preview')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('common.error'))
        setState('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleApply() {
    if (confirmText !== 'CONFIRM') return
    setState('applying')
    setError(null)
    try {
      await applyFn()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('preview')
    }
  }

  const canConfirm = confirmText === 'CONFIRM' && state === 'preview'

  return (
    <Modal open={open} onClose={state === 'applying' ? () => {} : onClose} title={title} size="md">
      <div className="flex flex-col gap-5">
        {description && (
          <p className="text-small text-fg-secondary">{description}</p>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={28} className="animate-spin text-fg-tertiary" />
            <p className="text-small text-fg-tertiary">{t('common.loading')}</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertTriangle size={28} className="text-error" />
            <p className="text-small text-error">{error}</p>
            <Button variant="outline" size="sm" onClick={onClose}>{t('common.close')}</Button>
          </div>
        )}

        {(state === 'preview' || state === 'applying') && impact && (
          <>
            {/* Impact summary */}
            <div className="rounded-xl border border-border bg-bg-alt overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-warning/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-warning flex-shrink-0" />
                  <span className="font-sans font-semibold text-small text-fg-primary">{t('config.change_impact.title')}</span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-0.5">{t('config.change_impact.documents_affected')}</p>
                    <p className="font-sans font-bold text-fg-primary text-[24px]">{impact.documents_affected.toLocaleString('el-GR')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-0.5">{t('config.change_impact.companies_affected')}</p>
                    <p className="font-sans font-bold text-fg-primary text-[24px]">{impact.companies_affected.toLocaleString('el-GR')}</p>
                  </div>
                </div>

                {impact.estimated_time_seconds != null && (
                  <p className="text-[12px] text-fg-tertiary">
                    {t('config.change_impact.estimated_time')}: ~{impact.estimated_time_seconds}s
                  </p>
                )}

                {(impact.current_value || impact.new_value) && (
                  <div className="flex items-center gap-2 text-small">
                    {impact.current_value && (
                      <span className="font-mono text-[12px] bg-error/10 text-error px-2 py-1 rounded">{impact.current_value}</span>
                    )}
                    {impact.current_value && impact.new_value && (
                      <span className="text-fg-tertiary">→</span>
                    )}
                    {impact.new_value && (
                      <span className="font-mono text-[12px] bg-success/10 text-success px-2 py-1 rounded">{impact.new_value}</span>
                    )}
                  </div>
                )}

                {impact.warnings?.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-warning">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}
              </div>
            </div>

            {/* CONFIRM input */}
            <div>
              <label className="block text-small text-fg-secondary mb-2">
                {t('config.change_impact.type_confirm')}
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRM"
                disabled={state === 'applying'}
                className="font-mono"
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-[12px] text-error">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={state === 'applying'}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                disabled={!canConfirm}
              >
                {state === 'applying' ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 size={14} className="mr-1.5" />
                )}
                {state === 'applying' ? t('common.loading') : t('common.confirm')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
