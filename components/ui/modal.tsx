'use client'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 440,
  md: 560,
  lg: 720,
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,30,46,0.5)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 flex flex-col max-h-[90vh] bg-bg-surface rounded-2xl shadow-xl overflow-hidden"
        style={{ width: '100%', maxWidth: sizes[size] }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-sans font-bold text-fg-primary" style={{ fontSize: 17 }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-alt transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
