import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // Override spacing with 8px base design system
    spacing: {
      px: '1px',
      '0': '0px',
      '0.5': '2px',
      '1': '4px',
      '1.5': '6px',
      '2': '8px',
      '2.5': '10px',
      '3': '12px',
      '3.5': '14px',
      '4': '16px',
      '5': '20px',
      '6': '24px',
      '7': '28px',
      '8': '32px',
      '9': '36px',
      '10': '40px',
      '11': '44px',
      '12': '48px',
      '14': '56px',
      '16': '64px',
      '20': '80px',
      '24': '96px',
      '28': '112px',
      '32': '128px',
      '36': '144px',
      '40': '160px',
      '44': '176px',
      '48': '192px',
      '52': '208px',
      '56': '224px',
      '60': '240px',
      '64': '256px',
      '72': '288px',
      '80': '320px',
      '96': '384px',
    },
    extend: {
      colors: {
        // Raw TITAN palette
        'titan-navy': '#0F1E2E',
        'titan-blue': '#1A3A5C',
        'titan-teal': '#2B7A9E',
        'titan-gold': '#C4956A',
        'titan-amber': '#F59E0B',
        'titan-red': '#DC2626',
        'titan-green': '#10B981',
        'aegean-navy': '#1A3A5C',
        'copper-gold': '#C4956A',
        'copper-gold-hover': '#B17F4F',
        'greece-blue': '#0D5EAF',

        // Semantic roles
        primary: {
          DEFAULT: '#1A3A5C',
          hover: '#13294A',
          fg: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#C4956A',
          hover: '#B17F4F',
          fg: '#FFFFFF',
        },
        success: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg: '#FEF3C7',
        },
        error: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
        },
        info: {
          DEFAULT: '#2B7A9E',
          bg: '#DBEAFE',
        },

        // Background system
        bg: {
          DEFAULT: '#FAFBFC',
          surface: '#FFFFFF',
          elevated: '#FFFFFF',
          alt: '#F3F4F6',
          navy: '#0F1E2E',
        },

        // Foreground system
        fg: {
          primary: '#0F172A',
          secondary: '#475569',
          tertiary: '#94A3B8',
          'on-dark': '#FFFFFF',
          'on-primary': '#FFFFFF',
        },

        // Border system
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        divider: '#F1F5F9',
      },

      fontFamily: {
        display: ['"Jaques Display"', 'Georgia', 'serif'],
        sans: ['"Cera Pro"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['"Nunito Sans"', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Monaco', '"Cascadia Code"', '"Roboto Mono"', 'monospace'],
      },

      fontSize: {
        display: ['clamp(36px, 4vw, 56px)', { lineHeight: '1.2' }],
        h1: ['clamp(28px, 3vw, 36px)', { lineHeight: '1.2' }],
        h2: ['clamp(22px, 2.2vw, 28px)', { lineHeight: '1.2' }],
        h3: ['20px', { lineHeight: '1.4' }],
        h4: ['18px', { lineHeight: '1.4' }],
        body: ['15px', { lineHeight: '1.6' }],
        small: ['14px', { lineHeight: '1.6' }],
        micro: ['12px', { lineHeight: '1.6' }],
        label: ['11px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
      },

      borderRadius: {
        sm: '4px',
        md: '6px',
        DEFAULT: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        pill: '999px',
      },

      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 30, 46, 0.04)',
        sm: '0 1px 3px 0 rgba(15, 30, 46, 0.08), 0 1px 2px -1px rgba(15, 30, 46, 0.04)',
        DEFAULT: '0 1px 3px 0 rgba(15, 30, 46, 0.08), 0 1px 2px -1px rgba(15, 30, 46, 0.04)',
        md: '0 4px 6px -1px rgba(15, 30, 46, 0.08), 0 2px 4px -2px rgba(15, 30, 46, 0.04)',
        lg: '0 10px 15px -3px rgba(15, 30, 46, 0.08), 0 4px 6px -4px rgba(15, 30, 46, 0.04)',
        xl: '0 20px 25px -5px rgba(15, 30, 46, 0.10), 0 8px 10px -6px rgba(15, 30, 46, 0.04)',
        glass: '0 8px 32px rgba(15, 30, 46, 0.12)',
        none: 'none',
      },

      width: {
        sidebar: '260px',
      },

      height: {
        header: '64px',
        'mobile-header': '56px',
        'mobile-tabs': '64px',
      },

      maxWidth: {
        container: '1440px',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'smooth-inout': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },

      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
        slower: '600ms',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },

      animation: {
        'fade-up': 'fade-up 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
