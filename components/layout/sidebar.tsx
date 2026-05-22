'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Settings,
  Activity,
  FileText,
  FolderSync,
  Search,
  Users,
  CreditCard,
  LogOut,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TitanLogo } from './titan-logo'
import { useT } from '@/lib/i18n/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.title' },
  { href: '/config', icon: Settings, labelKey: 'config.title' },
  { href: '/monitoring', icon: Activity, labelKey: 'monitoring.title' },
  { href: '/reports', icon: FileText, labelKey: 'reports.title' },
  { href: '/drive-cleanup', icon: FolderSync, labelKey: 'drive.cleanup' },
  { href: '/drive-audit', icon: Search, labelKey: 'drive.audit' },
  { href: '/members', icon: Users, labelKey: 'members.title' },
  { href: '/subscription', icon: CreditCard, labelKey: 'subscription.title' },
]

interface SidebarProps {
  userEmail?: string | null
  userInitials?: string
}

export function Sidebar({ userEmail, userInitials = 'U' }: SidebarProps) {
  const pathname = usePathname()
  const t = useT()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="flex flex-col h-full bg-bg-surface border-r border-border"
      style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-6 border-b border-border shrink-0"
        style={{ height: 'var(--header-height)' }}
      >
        <TitanLogo size="default" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, labelKey }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-small font-medium transition-all duration-fast ease-smooth',
                    isActive
                      ? 'bg-primary/8 text-primary font-semibold'
                      : 'text-fg-secondary hover:bg-bg-alt hover:text-fg-primary'
                  )}
                  style={
                    isActive
                      ? { backgroundColor: 'rgba(26, 58, 92, 0.08)', color: 'var(--primary)' }
                      : undefined
                  }
                >
                  <Icon
                    size={18}
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-primary' : 'text-fg-tertiary'
                    )}
                    style={isActive ? { color: 'var(--primary)' } : undefined}
                  />
                  <span>{t(labelKey)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User profile */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, var(--titan-blue), var(--titan-teal))',
            }}
          >
            {userInitials}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-small font-medium text-fg-primary truncate">
              {userEmail ?? t('common.user')}
            </p>
          </div>

          <button
            onClick={handleSignOut}
            title={t('common.sign_out')}
            className="shrink-0 text-fg-tertiary hover:text-fg-primary transition-colors duration-fast"
          >
            <LogOut size={16} />
          </button>
        </div>

        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-small text-fg-secondary hover:bg-bg-alt hover:text-fg-primary transition-all duration-fast mt-0.5"
        >
          <User size={16} className="shrink-0 text-fg-tertiary" />
          <span>{t('profile.title')}</span>
        </Link>
      </div>
    </aside>
  )
}
