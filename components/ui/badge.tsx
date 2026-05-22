import { type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 text-[12px] font-semibold rounded-pill leading-tight',
  {
    variants: {
      variant: {
        success: 'bg-success-bg text-emerald-800',
        warning: 'bg-warning-bg text-amber-800',
        error: 'bg-error-bg text-red-800',
        info: 'bg-info-bg text-blue-800',
        neutral: 'bg-bg-alt text-fg-secondary',
        primary: 'bg-primary/10 text-primary',
        accent: 'bg-accent/15 text-amber-800',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
