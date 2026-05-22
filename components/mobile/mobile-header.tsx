'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { TitanLogo } from '@/components/layout/titan-logo'

interface MobileHeaderProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
  showLogo?: boolean
}

export function MobileHeader({
  title,
  showBack = false,
  rightAction,
  showLogo = false,
}: MobileHeaderProps) {
  const router = useRouter()

  return (
    <header
      className="sticky top-0 z-30 flex items-center bg-bg-surface border-b border-border px-4"
      style={{ height: 'var(--mobile-header)' }}
    >
      {/* Left slot */}
      <div className="w-10 flex items-center">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center text-fg-secondary hover:text-fg-primary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>

      {/* Center */}
      <div className="flex-1 flex items-center justify-center">
        {showLogo ? (
          <TitanLogo size="sm" />
        ) : (
          <h1 className="font-sans font-semibold text-fg-primary" style={{ fontSize: 16 }}>
            {title}
          </h1>
        )}
      </div>

      {/* Right slot */}
      <div className="w-10 flex items-center justify-end">
        {rightAction}
      </div>
    </header>
  )
}
