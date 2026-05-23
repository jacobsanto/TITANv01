'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { Loader2, User, Globe, Palette, KeyRound, AlertTriangle } from 'lucide-react'

interface Profile {
  display_name: string | null
  email: string
  avatar_url: string | null
  locale: string | null
  theme: string | null
  google_token_set: boolean
}

type Theme = 'light' | 'dark' | 'system'
type Locale = 'el' | 'en'

export function ProfileView() {
  const t = useT()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [locale, setLocale] = useState<Locale>('el')
  const [theme, setTheme] = useState<Theme>('system')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, locale, theme')
          .eq('id', user.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        const { data: tokenData } = await supabase
          .from('user_settings')
          .select('setting_value')
          .eq('user_id', user.id)
          .eq('setting_key', 'google_token_set')
          .maybeSingle()

        const p: Profile = {
          display_name: data?.display_name ?? null,
          email: user.email ?? '',
          avatar_url: data?.avatar_url ?? null,
          locale: data?.locale ?? 'el',
          theme: data?.theme ?? 'system',
          google_token_set: tokenData?.setting_value === 'true',
        }
        setProfile(p)
        setDisplayName(p.display_name ?? '')
        setLocale((p.locale as Locale) ?? 'el')
        setTheme((p.theme as Theme) ?? 'system')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [t])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('common.error'))

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() || null, locale, theme })
        .eq('id', user.id)

      if (updateError) throw updateError
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRevokeGoogle() {
    setRevoking(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('common.error'))

      const { data: member } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (member?.org_id) {
        await callEdge('revoke-google-token', { org_id: member.org_id })
      }
      setProfile(prev => prev ? { ...prev, google_token_set: false } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="hidden md:flex sticky top-0 z-10 items-center px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('profile.title')}</h1>
      </div>

      <div className="flex-1 p-6 max-w-xl flex flex-col gap-6">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-fg-tertiary" /></div>
        ) : (
          <>
            {/* Avatar + Identity */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-bg-alt border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="avatar" width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-fg-tertiary" />
                  )}
                </div>
                <div>
                  <p className="font-sans font-semibold text-fg-primary">{profile?.email}</p>
                  <p className="text-[12px] text-fg-tertiary">Google OAuth</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-fg-tertiary mb-1.5">{t('profile.display_name')}</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={profile?.email ?? ''}
                />
              </div>
            </div>

            {/* Language */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={15} className="text-fg-tertiary" />
                <p className="font-sans font-semibold text-fg-primary">{t('profile.language')}</p>
              </div>
              <div className="flex gap-2">
                {(['el', 'en'] as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`flex-1 px-3 py-2 rounded-lg text-small border transition-colors ${
                      locale === l
                        ? 'bg-primary text-primary-fg border-primary'
                        : 'bg-bg-surface text-fg-secondary border-border hover:border-border-strong'
                    }`}
                  >
                    {l === 'el' ? 'Ελληνικά' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette size={15} className="text-fg-tertiary" />
                <p className="font-sans font-semibold text-fg-primary">{t('profile.theme')}</p>
              </div>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as Theme[]).map((th) => (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={`flex-1 px-3 py-2 rounded-lg text-small border transition-colors ${
                      theme === th
                        ? 'bg-primary text-primary-fg border-primary'
                        : 'bg-bg-surface text-fg-secondary border-border hover:border-border-strong'
                    }`}
                  >
                    {t(`profile.${th}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Google Token */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-fg-tertiary" />
                <p className="font-sans font-semibold text-fg-primary">Google</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-small text-fg-secondary">{t('profile.google_connected')}</p>
                  <p className="text-[12px] text-fg-tertiary">
                    {profile?.google_token_set ? 'Token αποθηκευμένο' : 'Δεν υπάρχει αποθηκευμένο token'}
                  </p>
                </div>
                {profile?.google_token_set && (
                  <Button variant="outline" size="sm" onClick={handleRevokeGoogle} disabled={revoking}>
                    {revoking && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                    {t('profile.revoke_google')}
                  </Button>
                )}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between">
              {saved && (
                <span className="text-small text-success">{t('common.success')}</span>
              )}
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} className="ml-auto">
                {saving && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                {t('profile.save_profile')}
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="bg-bg-surface border border-error/20 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-error" />
                <p className="font-sans font-semibold text-error">{t('profile.danger_zone')}</p>
              </div>
              <p className="text-small text-fg-secondary">
                Η διαγραφή λογαριασμού είναι μη αναστρέψιμη και θα αφαιρέσει όλα τα δεδομένα σας.
              </p>
              <Button variant="outline" size="sm" className="self-start border-error/30 text-error hover:bg-error/5">
                {t('profile.delete_account')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
