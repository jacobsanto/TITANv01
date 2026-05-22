'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Info, Eye, EyeOff, Loader2 } from 'lucide-react'
import { TitanLogo } from '@/components/layout/titan-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/utils'

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ')

export default function LoginPage() {
  const t = useT()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: GOOGLE_SCOPES,
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setGoogleLoading(false)
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setEmailLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        background: 'linear-gradient(135deg, #0F1E2E 0%, #1A3A5C 50%, #1B4F72 100%)',
      }}
    >
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 50% at 30% 60%, rgba(196,149,106,0.1) 0%, transparent 60%)',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Card */}
      <div
        className="relative z-10 w-full animate-fade-up"
        style={{
          maxWidth: 440,
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 16,
          padding: 40,
          boxShadow: '0 24px 64px rgba(15,30,46,0.4)',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <TitanLogo size="default" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-sans font-bold text-fg-primary mb-2" style={{ fontSize: 24 }}>
            {t('landing.sign_in')}
          </h1>
          <p className="text-[14px] text-fg-secondary">
            Συνδεθείτε για πρόσβαση στο dashboard σας
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg text-[14px] text-red-700"
            style={{ background: 'var(--error-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
            {error}
          </div>
        )}

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 h-12 rounded-lg font-sans font-semibold text-[15px] text-fg-primary border border-border-strong bg-white transition-all duration-150 hover:bg-bg-alt hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed mb-5"
        >
          {googleLoading ? (
            <Loader2 size={20} className="animate-spin text-fg-tertiary" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Σύνδεση...' : t('auth.sign_in_with_google')}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-fg-tertiary font-medium">ή</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="label block mb-1.5">{t('auth.email')}</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label">{t('auth.password')}</label>
              <a href="#" className="text-[12px] text-titan-teal hover:text-primary transition-colors">
                {t('auth.forgot_password')}
              </a>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={emailLoading}
          >
            {emailLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : null}
            {emailLoading ? 'Σύνδεση...' : t('auth.sign_in')}
          </Button>
        </form>

        {/* Info box */}
        <div
          className="mt-5 flex gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'var(--info-bg)', border: '1px solid rgba(43,122,158,0.2)' }}
        >
          <Info size={16} style={{ color: '#2B7A9E', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[13px] leading-snug" style={{ color: '#0C4A6E' }}>
            Το TITAN χρησιμοποιεί το Google account σας για πρόσβαση στο Google Drive και Gmail. Δεν αποθηκεύεται κωδικός.
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center">
          <p className="text-[13px] text-fg-tertiary">
            Νέος στο TITAN;{' '}
            <a href="#" className="text-titan-teal hover:text-primary transition-colors">
              Μάθετε περισσότερα
            </a>
          </p>
          <div className="flex justify-center gap-4 mt-3">
            <a href="#" className="text-[12px] text-fg-tertiary hover:text-fg-secondary transition-colors">
              {t('auth.terms')}
            </a>
            <a href="#" className="text-[12px] text-fg-tertiary hover:text-fg-secondary transition-colors">
              {t('auth.privacy')}
            </a>
          </div>
          <p className="text-[12px] text-fg-tertiary mt-2">
            🇬🇷 myDATA &amp; ΑΑΔΕ compliant
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
