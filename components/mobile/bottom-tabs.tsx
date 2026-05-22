'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Camera, Activity, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n/utils'

const tabs = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.overview' },
  { href: '/reports', icon: FileText, labelKey: 'reports.title' },
  { href: '/ocr', icon: Camera, labelKey: 'common.upload', isCenter: true },
  { href: '/monitoring', icon: Activity, labelKey: 'monitoring.title' },
  { href: '/config', icon: Menu, labelKey: 'common.settings' },
]

export function BottomTabs() {
  const pathname = usePathname()
  const t = useT()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border z-40 flex items-center"
      style={{ height: 'var(--mobile-tabs)' }}
    >
      {tabs.map(({ href, icon: Icon, labelKey, isCenter }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-fast',
              isCenter && 'relative'
            )}
          >
            {isCenter ? (
              <div
                className="flex items-center justify-center rounded-full text-white shadow-md"
                style={{
                  width: 44,
                  height: 44,
                  background: 'var(--primary)',
                  marginBottom: 2,
                }}
              >
                <Icon size={22} />
              </div>
            ) : (
              <>
                <Icon
                  size={22}
                  style={{ color: isActive ? 'var(--primary)' : 'var(--fg-tertiary)' }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? 'var(--primary)' : 'var(--fg-tertiary)' }}
                >
                  {t(labelKey)}
                </span>
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
