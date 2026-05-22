import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-sans font-semibold whitespace-nowrap select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md',
        accent: 'bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md',
        outline: 'bg-transparent text-fg-primary border border-border-strong hover:bg-bg-alt',
        ghost: 'bg-transparent text-fg-secondary hover:bg-bg-alt hover:text-fg-primary',
        destructive: 'bg-error text-white hover:bg-red-700 shadow-sm hover:shadow-md',
        'outline-white':
          'bg-transparent text-white border border-white/40 hover:bg-white/10',
      },
      size: {
        sm: 'h-8 px-3 text-[12px] rounded-lg',
        default: 'h-10 px-5 text-[14px] rounded-lg',
        lg: 'h-12 px-7 text-[15px] rounded-lg',
        xl: 'h-14 px-8 text-[15px] rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
