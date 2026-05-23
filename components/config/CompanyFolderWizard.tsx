'use client'

import { useEffect, useState } from 'react'
import { callEdge } from '@/lib/edge'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useT } from '@/lib/i18n/utils'
import { AlertTriangle, Loader2, FolderOpen } from 'lucide-react'
import type { ChangeImpact } from './ChangeImpactWizard'

interface CompanyFolderWizardProps {
  open: boolean
  onClose: () => void
  orgId: string
  setupId: string
  companyId: string
  companyName: string
  currentFolderId: string | null
  onSuccess: () => void
}

type State = 'input' | 'loading' | 'preview' | 'applying' | 'error'

export function CompanyFolderWizard({
  open,
  onClose,
  orgId,
  setupId,
  companyId,
  companyName,
  currentFolderId,
  onSuccess,
}: CompanyFolderWizardProps) {
  const t = useT()
  const [state, setState] = useState<State>('input')
  const [newFolderId, setNewFolderId] = useState('')
  const [impact, setImpact] = useState<ChangeImpact | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setNewFolderId('')
      setConfirmText('')
      setError(null)
      setImpact(null)
      setState('input')
    }
  }, [open])

  async function handlePreview() {
    if (!newFolderId.trim()) return
    setState('loading')
    setError(null)
    try {
      const result = await callEdge<ChangeImpact>('preview-company-folder-change', {
        org_id: orgId,
        setup_id: setupId,
        company_id: companyId,
        new_folder_id: newFolderId.trim(),
      })
      setImpact(result)
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('error')
    }
  }

  async function handleApply() {
    if (confirmText !== 'CONFIRM') return
    setState('applying')
    setError(null)
    try {
      await callEdge('apply-company-folder-change', {
        org_id: orgId,
        setup_id: setupId,
        company_id: companyId,
        new_folder_id: newFolderId.trim(),
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setState('preview')
    }
  }

  return (
    <Modal
      open={open}
      onClose={state === 'applying' || state === 'loading' ? () => {} : onClose}
      title={t('config.company_folder_change.title')}
      size="md"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-small text-fg-secondary">
          <FolderOpen size={16} className="text-fg-tertiary" />
          <span className="font-sans font-medium text-fg-primary">{companyName}</span>
        </div>

        {(state === 'input' || state === 'loading') && (
          <>
            {currentFolderId && (
              <div>
                <label className="block text-[11px] text-fg-tertiary uppercase tracking-wider mb-1">
                  {t('config.company_folder_change.source_folder')}
                </label>
                <p className="font-mono text-[12px] text-fg-secondary bg-bg-alt px-3 py-2 rounded-lg">{currentFolderId}</p>
              </div>
            )}
            <div>
              <label className="block text-small text-fg-secondary mb-1.5">
                {t('config.company_folder_change.target_folder')} <span className="text-error">*</span>
              </label>
              <Input
                placeholder="Google Drive Folder ID"
                value={newFolderId}
                onChange={(e) => setNewFolderId(e.target.value)}
                className="font-mono"
                disabled={state === 'loading'}
              />
              <p className="mt-1 text-[11px] text-fg-tertiary">
                Βρείτε το ID φακέλου στο URL του Google Drive
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
              <Button variant="outline" size="sm" onClick={onClose} disabled={state === 'loading'}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePreview}
                disabled={!newFolderId.trim() || state === 'loading'}
              >
                {state === 'loading' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                {state === 'loading' ? t('common.loading') : t('common.preview')}
              </Button>
            </div>
          </>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <AlertTriangle size={24} className="text-error" />
            <p className="text-small text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setState('input')}>{t('common.back')}</Button>
          </div>
        )}

        {(state === 'preview' || state === 'applying') && impact && (
          <>
            <div className="rounded-xl border border-border bg-warning/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-warning/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-warning" />
                  <span className="font-sans font-semibold text-small text-fg-primary">{t('config.change_impact.title')}</span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-0.5">{t('config.change_impact.documents_affected')}</p>
                  <p className="font-sans font-bold text-fg-primary text-[24px]">{impact.documents_affected.toLocaleString('el-GR')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-0.5">{t('config.change_impact.companies_affected')}</p>
                  <p className="font-sans font-bold text-fg-primary text-[24px]">{impact.companies_affected.toLocaleString('el-GR')}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-small text-fg-secondary mb-1.5">
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

            {error && <p className="text-[12px] text-error">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
              <Button variant="outline" size="sm" onClick={() => setState('input')} disabled={state === 'applying'}>
                {t('common.back')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApply}
                disabled={confirmText !== 'CONFIRM' || state === 'applying'}
              >
                {state === 'applying' ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                {state === 'applying' ? t('common.loading') : t('common.confirm')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
