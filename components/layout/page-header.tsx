'use client'

interface PageHeaderProps {
  title: string
  action?: React.ReactNode
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div
      className="hidden md:flex sticky top-0 z-10 items-center justify-between px-6 border-b border-border bg-bg-surface shrink-0"
      style={{ height: 'var(--header-height)' }}
    >
      <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{title}</h1>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
