import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'w-full h-10 px-3 text-[14px] text-fg-primary bg-bg-surface border border-border rounded-lg',
        'placeholder:text-fg-tertiary',
        'outline-none focus:border-primary focus:ring-2 focus:ring-primary/10',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        mono && 'font-mono text-[12px]',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
