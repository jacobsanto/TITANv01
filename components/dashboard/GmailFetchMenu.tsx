'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Mail, ChevronDown, Clock, Calendar } from 'lucide-react'

interface GmailFetchMenuProps {
  orgId: string
  setupId: string
}

type FetchMode = 'last_24h' | 'last_7d' | 'last_30d' | 'all_unread'

const MODES: { value: FetchMode; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'last_24h', labelKey: 'Τελευταίες 24 ώρες', icon: <Clock size={14} /> },
  { value: 'last_7d', labelKey: 'Τελευταίες 7 μέρες', icon: <Calendar size={14} /> },
  { value: 'last_30d', labelKey: 'Τελευταίες 30 μέρες', icon: <Calendar size={14} /> },
  { value: 'all_unread', labelKey: 'Όλα τα Αδιάβαστα', icon: <Mail size={14} /> },
]

export function GmailFetchMenu({ orgId, setupId }: GmailFetchMenuProps) {
  const t = useT()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [selectedMode, setSelectedMode] = useState<FetchMode>('last_24h')

  async function handleFetch(mode: FetchMode) {
    setOpen(false)
    setSelectedMode(mode)
    setFetching(true)
    try {
      await callEdge('fetch-gmail-attachments', {
        org_id: orgId,
        setup_id: setupId,
        mode,
      })
      qc.invalidateQueries({ queryKey: ['invoices', orgId, setupId] })
      qc.invalidateQueries({ queryKey: ['job_runs', orgId, setupId] })
    } finally {
      setFetching(false)
    }
  }

  const currentLabel = MODES.find((m) => m.value === selectedMode)?.labelKey ?? ''

  return (
    <div className="relative">
      <div className="flex items-stretch rounded-lg overflow-hidden border border-border-strong shadow-xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleFetch(selectedMode)}
          disabled={fetching}
          className="rounded-none border-0 rounded-l-lg pr-3 gap-2"
        >
          <Mail size={15} className={fetching ? 'animate-bounce' : ''} />
          {fetching ? t('common.loading') : t('dashboard.fetch_gmail')}
        </Button>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={fetching}
          className="flex items-center justify-center px-2 border-l border-border-strong hover:bg-bg-alt transition-colors disabled:opacity-50"
          aria-label="Επιλογές ανάκτησης"
        >
          <ChevronDown size={14} className={`text-fg-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-bg-surface border border-border rounded-lg shadow-md overflow-hidden min-w-[200px]">
            {MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleFetch(mode.value)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-small text-fg-primary hover:bg-bg-alt transition-colors"
              >
                <span className="text-fg-tertiary">{mode.icon}</span>
                {mode.labelKey}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
