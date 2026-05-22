'use client'

import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { Sidebar } from './sidebar'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { BottomTabs } from '@/components/mobile/bottom-tabs'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail?: string | null
  pageTitle?: string
}

function getInitials(email?: string | null): string {
  if (!email) return 'U'
  const parts = email.split('@')[0].split(/[._-]/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function DashboardShell({ children, userEmail, pageTitle }: DashboardShellProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-bg">
        <MobileHeader title={pageTitle} showLogo={!pageTitle} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'var(--mobile-tabs)' }}
        >
          {children}
        </main>
        <BottomTabs />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar userEmail={userEmail} userInitials={getInitials(userEmail)} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
