import { cn } from '@/lib/utils'

interface TitanLogoProps {
  size?: 'sm' | 'default' | 'lg'
  className?: string
  showWordmark?: boolean
}

const sizes = {
  sm: { svg: 24, text: 'text-[14px]' },
  default: { svg: 32, text: 'text-[18px]' },
  lg: { svg: 48, text: 'text-[26px]' },
}

export function TitanLogo({ size = 'default', className, showWordmark = true }: TitanLogoProps) {
  const { svg, text } = sizes[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Geometric T logomark with circuit/data-flow motif */}
      <svg
        width={svg}
        height={svg}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer circle background */}
        <circle cx="24" cy="24" r="24" fill="#1A3A5C" />

        {/* T horizontal bar */}
        <rect x="10" y="13" width="28" height="6" rx="2" fill="#FFFFFF" />

        {/* T vertical stem */}
        <rect x="21" y="13" width="6" height="22" rx="2" fill="#FFFFFF" />

        {/* Circuit nodes — gold accent dots */}
        <circle cx="10" cy="16" r="2.5" fill="#C4956A" />
        <circle cx="38" cy="16" r="2.5" fill="#C4956A" />
        <circle cx="24" cy="35" r="2.5" fill="#C4956A" />

        {/* Data-flow connection lines */}
        <line x1="10" y1="16" x2="10" y2="26" stroke="#C4956A" strokeWidth="1" strokeOpacity="0.5" />
        <line x1="38" y1="16" x2="38" y2="26" stroke="#C4956A" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="10" cy="26" r="1.5" fill="#C4956A" fillOpacity="0.4" />
        <circle cx="38" cy="26" r="1.5" fill="#C4956A" fillOpacity="0.4" />
      </svg>

      {showWordmark && (
        <span
          className={cn(
            'font-sans font-bold tracking-wider text-fg-primary',
            text
          )}
          style={{ letterSpacing: '0.15em' }}
        >
          TITAN
        </span>
      )}
    </div>
  )
}
