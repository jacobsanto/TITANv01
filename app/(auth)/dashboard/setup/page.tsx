'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Key,
  Building2,
  FolderOpen,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Info,
  ArrowRight,
  Check,
  WifiOff,
} from 'lucide-react'
import { TitanLogo } from '@/components/layout/titan-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { callEdge } from '@/lib/edge'
import { useT } from '@/lib/i18n/utils'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 5

interface Company {
  id: number
  name: string
  afm: string
}

interface Folders {
  root: string
  invoiceInput: string
  bankInput: string
  duplicates: string
  trash: string
}

export default function SetupWizardPage() {
  const t = useT()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [companies, setCompanies] = useState<Company[]>([{ id: 1, name: '', afm: '' }])
  const [apiConnected, setApiConnected] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folders>({
    root: '/TITAN',
    invoiceInput: '/TITAN/Invoices',
    bankInput: '/TITAN/Bank Statements',
    duplicates: '/TITAN/Duplicates',
    trash: '/TITAN/Trash',
  })
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user already has an org (returning user who never finished setup)
  useEffect(() => {
    async function checkExistingOrg() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data?.org_id) setOrgId(data.org_id)
    }
    checkExistingOrg()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step handlers ──────────────────────────────────────────

  async function handleConnectApis() {
    setApiLoading(true)
    setApiError(null)
    const supabase = createClient()
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.provider_token) {
        // Store Google token encrypted
        await callEdge('store-google-token', {
          token: session.provider_token,
          refresh_token: session.provider_refresh_token ?? undefined,
        })
        // Verify connectivity
        await callEdge('verify-google-apis')
        setApiConnected(true)
      } else {
        // No Google token — re-authenticate with Drive/Gmail scopes
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: [
              'https://www.googleapis.com/auth/drive',
              'https://www.googleapis.com/auth/gmail.readonly',
              'https://www.googleapis.com/auth/spreadsheets',
            ].join(' '),
            redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/setup`,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          },
        })
        if (error) throw error
      }
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Αδυναμία σύνδεσης με Google APIs. Παρακαλώ δοκιμάστε ξανά.'
      )
    } finally {
      setApiLoading(false)
    }
  }

  async function handleCompaniesNext() {
    const validCompanies = companies.filter((c) => c.name.trim())
    if (validCompanies.length === 0) {
      setError('Προσθέστε τουλάχιστον μία εταιρεία.')
      return
    }

    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let currentOrgId = orgId

      if (!currentOrgId) {
        // Create organization using first company name
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: validCompanies[0].name })
          .select('id')
          .single()

        if (orgError) throw orgError
        currentOrgId = org.id

        // Add user as super_admin
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            org_id: currentOrgId,
            user_id: user.id,
            role: 'super_admin',
            joined_at: new Date().toISOString(),
          })
        if (memberError) throw memberError

        setOrgId(currentOrgId)
      }

      // Insert companies
      const { error: companiesError } = await supabase.from('companies').insert(
        validCompanies.map((c) => ({
          org_id: currentOrgId,
          user_id: user.id,
          name: c.name.trim(),
          afm: c.afm.trim() || null,
          is_active: true,
        }))
      )
      if (companiesError) throw companiesError

      // Create initial config snapshot
      const { error: snapshotError } = await supabase.from('config_snapshots').insert({
        org_id: currentOrgId,
        name: 'Initial Setup v1',
        is_active: true,
        snapshot: {},
        created_by: user.id,
        notes: 'Auto-created during setup wizard',
      })
      if (snapshotError) throw snapshotError

      setStep((s) => s + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFoldersNext() {
    if (!orgId) {
      setError('Σφάλμα: Δεν βρέθηκε οργανισμός. Παρακαλώ επιστρέψτε στο προηγούμενο βήμα.')
      return
    }

    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const settings = [
        { key: 'root_folder_id', value: folders.root },
        { key: 'invoice_input_folder_id', value: folders.invoiceInput },
        { key: 'bank_input_folder_id', value: folders.bankInput },
        { key: 'duplicates_folder_id', value: folders.duplicates },
        { key: 'trash_folder_id', value: folders.trash },
      ].filter((s) => s.value.trim())

      const { error: settingsError } = await supabase.from('user_settings').upsert(
        settings.map(({ key, value }) => ({
          org_id: orgId,
          user_id: user.id,
          setting_key: key,
          setting_value: value.trim(),
        })),
        { onConflict: 'org_id,user_id,setting_key' }
      )
      if (settingsError) throw settingsError

      setStep((s) => s + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFinish() {
    setIsLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const currentOrgId = orgId
      if (!currentOrgId) throw new Error('No organization found')

      const { error: completeError } = await supabase.from('user_settings').upsert(
        {
          org_id: currentOrgId,
          user_id: user.id,
          setting_key: 'setup_complete',
          setting_value: 'true',
        },
        { onConflict: 'org_id,user_id,setting_key' }
      )
      if (completeError) throw completeError

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setIsLoading(false)
    }
  }

  function handleNext() {
    if (step === 2) return handleCompaniesNext()
    if (step === 3) return handleFoldersNext()
    setError(null)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function handleBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  // ── Company management ──────────────────────────────────────
  function addCompany() {
    setCompanies((prev) => [...prev, { id: Date.now(), name: '', afm: '' }])
  }

  function removeCompany(id: number) {
    if (companies.length <= 1) return
    setCompanies((prev) => prev.filter((c) => c.id !== id))
  }

  function updateCompany(id: number, field: keyof Company, value: string) {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const stepLabels = [
    t('setup.step_welcome'),
    t('setup.step_google_apis'),
    t('setup.step_companies'),
    t('setup.step_drive_folders'),
    t('setup.step_done'),
  ]

  const isLastStep = step === TOTAL_STEPS - 1
  const canProceedStep1 = step !== 1 || apiConnected

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-6 md:px-10 bg-bg-surface border-b border-border"
        style={{ height: 64 }}
      >
        <TitanLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-fg-secondary hidden sm:block">
            {t('setup.progress')
              .replace('{{step}}', String(step + 1))
              .replace('{{total}}', String(TOTAL_STEPS))}
          </span>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {stepLabels.map((label, i) => (
              <div
                key={label}
                title={label}
                className="rounded-full transition-all duration-250"
                style={{
                  width: i === step ? 28 : 8,
                  height: 8,
                  background:
                    i < step
                      ? 'var(--success)'
                      : i === step
                      ? 'var(--primary)'
                      : 'var(--border)',
                }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-border shrink-0">
        <div
          className="h-full transition-all duration-slow ease-smooth"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--accent))',
          }}
        />
      </div>

      {/* Body */}
      <main className="flex-1 flex items-start md:items-center justify-center px-4 py-10">
        <div className="w-full" style={{ maxWidth: 640 }}>
          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg text-[14px] text-red-700 animate-fade-up"
              style={{ background: 'var(--error-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
              {error}
            </div>
          )}

          {/* ── Step 0: Welcome ────────────────────────── */}
          {step === 0 && (
            <div className="animate-fade-up">
              <h1 className="font-sans font-bold text-fg-primary mb-3" style={{ fontSize: 28 }}>
                {t('setup.welcome_title')}
              </h1>
              <p className="text-[15px] text-fg-secondary mb-8 leading-relaxed">
                {t('setup.welcome_description')}. Ο οδηγός αυτός θα σας βοηθήσει να ρυθμίσετε την πρόσβαση σε Google APIs, να προσθέσετε τις εταιρείες σας και να διαμορφώσετε τη δομή φακέλων Drive.
              </p>

              <div className="rounded-xl border border-border bg-bg-surface p-6"
                style={{ boxShadow: 'var(--shadow-sm)' }}>
                <h2 className="font-sans font-semibold text-fg-primary mb-5" style={{ fontSize: 16 }}>
                  Τι θα ρυθμίσουμε
                </h2>
                <div className="space-y-4">
                  {[
                    { icon: Key, label: t('setup.step_google_apis'), color: '#1A3A5C', bg: 'rgba(26,58,92,0.08)' },
                    { icon: Building2, label: t('setup.step_companies'), color: '#C4956A', bg: 'rgba(196,149,106,0.12)' },
                    { icon: FolderOpen, label: t('setup.step_drive_folders'), color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
                  ].map(({ icon: Icon, label, color, bg }) => (
                    <div key={label} className="flex items-center gap-4">
                      <div className="flex items-center justify-center rounded-xl shrink-0"
                        style={{ width: 44, height: 44, background: bg }}>
                        <Icon size={22} style={{ color }} />
                      </div>
                      <span className="text-[15px] font-medium text-fg-primary">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Google APIs ────────────────────── */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h1 className="font-sans font-bold text-fg-primary mb-3" style={{ fontSize: 28 }}>
                {t('setup.step_google_apis')}
              </h1>
              <p className="text-[15px] text-fg-secondary mb-8 leading-relaxed">
                Το TITAN χρειάζεται πρόσβαση στο Google Drive (για αποθήκευση εγγράφων) και Gmail (για σάρωση τιμολογίων). Κάντε κλικ παρακάτω για εξουσιοδότηση.
              </p>

              {/* API status */}
              <div
                className="flex items-center gap-4 p-5 rounded-xl border mb-5 transition-all duration-250"
                style={{
                  background: apiConnected ? 'var(--success-bg)' : 'var(--bg-alt)',
                  borderColor: apiConnected ? 'var(--success)' : 'var(--border)',
                }}
              >
                <div className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: apiConnected ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  }}>
                  {apiConnected ? (
                    <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
                  ) : (
                    <WifiOff size={24} style={{ color: 'var(--fg-tertiary)' }} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[15px]"
                    style={{ color: apiConnected ? '#065F46' : 'var(--fg-primary)' }}>
                    {apiConnected ? 'Συνδεδεμένο' : 'Μη Συνδεδεμένο'}
                  </p>
                  <p className="text-[13px]"
                    style={{ color: apiConnected ? '#047857' : 'var(--fg-secondary)' }}>
                    {apiConnected ? 'Drive & Gmail πρόσβαση χορηγήθηκε' : 'Απαιτείται εξουσιοδότηση'}
                  </p>
                </div>
              </div>

              {apiError && (
                <div className="mb-4 px-4 py-3 rounded-lg text-[13px] text-red-700"
                  style={{ background: 'var(--error-bg)' }}>
                  {apiError}
                </div>
              )}

              {!apiConnected && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mb-5"
                  onClick={handleConnectApis}
                  disabled={apiLoading}
                >
                  {apiLoading ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
                  {apiLoading ? 'Σύνδεση...' : 'Εξουσιοδότηση Google APIs'}
                </Button>
              )}

              <div className="flex gap-3 px-4 py-3 rounded-lg"
                style={{ background: 'var(--info-bg)', border: '1px solid rgba(43,122,158,0.2)' }}>
                <Info size={15} style={{ color: '#2B7A9E', flexShrink: 0, marginTop: 1 }} />
                <p className="text-[13px] leading-snug" style={{ color: '#0C4A6E' }}>
                  Το TITAN θα ζητήσει πρόσβαση ανάγνωσης/εγγραφής στο Drive και μόνο ανάγνωσης στο Gmail. Σαρώνουμε μόνο για τιμολόγια — δεν στέλνουμε ποτέ emails για λογαριασμό σας.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Companies ──────────────────────── */}
          {step === 2 && (
            <div className="animate-fade-up">
              <h1 className="font-sans font-bold text-fg-primary mb-3" style={{ fontSize: 28 }}>
                {t('setup.step_companies')}
              </h1>
              <p className="text-[15px] text-fg-secondary mb-8 leading-relaxed">
                Προσθέστε τις εταιρείες που διαχειρίζεστε. Κάθε εταιρεία αποκτά τη δική της δομή φακέλων και ρυθμίσεις.
              </p>

              <div className="space-y-3 mb-5">
                {companies.map((company, idx) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-surface"
                  >
                    <span className="text-[13px] font-semibold text-fg-tertiary w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <Input
                      placeholder="Όνομα εταιρείας"
                      value={company.name}
                      onChange={(e) => updateCompany(company.id, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="ΑΦΜ"
                      value={company.afm}
                      onChange={(e) => updateCompany(company.id, 'afm', e.target.value)}
                      mono
                      style={{ maxWidth: 130 }}
                    />
                    {companies.length > 1 && (
                      <button
                        onClick={() => removeCompany(company.id)}
                        className="shrink-0 text-fg-tertiary hover:text-error transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addCompany}
                className="flex items-center gap-2 text-[14px] font-medium text-titan-teal hover:text-primary transition-colors"
              >
                <Plus size={16} />
                Προσθήκη Άλλης Εταιρείας
              </button>
            </div>
          )}

          {/* ── Step 3: Drive Folders ─────────────────── */}
          {step === 3 && (
            <div className="animate-fade-up">
              <h1 className="font-sans font-bold text-fg-primary mb-3" style={{ fontSize: 28 }}>
                {t('setup.step_drive_folders')}
              </h1>
              <p className="text-[15px] text-fg-secondary mb-8 leading-relaxed">
                Ορίστε πού θα αποθηκεύει το TITAN τα έγγραφα στο Google Drive σας. Χρησιμοποιήστε Folder IDs ή διαδρομές.
              </p>

              <div className="rounded-xl border border-border bg-bg-surface overflow-hidden"
                style={{ boxShadow: 'var(--shadow-sm)' }}>
                {[
                  { key: 'root' as const, label: 'Κύριος Φάκελος', hint: 'Root' },
                  { key: 'invoiceInput' as const, label: 'Είσοδος Τιμολογίων', hint: 'Invoices Input' },
                  { key: 'bankInput' as const, label: 'Είσοδος Τράπεζας', hint: 'Bank Input' },
                  { key: 'duplicates' as const, label: 'Φάκελος Διπλοτύπων', hint: 'Duplicates' },
                  { key: 'trash' as const, label: 'Φάκελος Απορριμμάτων', hint: 'Trash' },
                ].map(({ key, label, hint }, idx, arr) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center gap-4 p-4',
                      idx < arr.length - 1 && 'border-b border-divider'
                    )}
                  >
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <p className="text-label text-fg-tertiary uppercase">{label}</p>
                      <p className="text-[11px] text-fg-tertiary">{hint}</p>
                    </div>
                    <Input
                      mono
                      value={folders[key]}
                      onChange={(e) => setFolders((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={`/TITAN/${hint}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 px-4 py-3 rounded-lg mt-5"
                style={{ background: 'var(--info-bg)', border: '1px solid rgba(43,122,158,0.2)' }}>
                <Info size={15} style={{ color: '#2B7A9E', flexShrink: 0, marginTop: 1 }} />
                <p className="text-[13px] leading-snug" style={{ color: '#0C4A6E' }}>
                  Εντός κάθε φακέλου, το TITAN θα δημιουργεί υποφακέλους ανά εταιρεία (π.χ. <code className="font-mono text-[11px]">/TITAN/Invoices/Arivia Group/</code>).
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ───────────────────────────── */}
          {step === 4 && (
            <div className="animate-fade-up text-center">
              {/* Success icon */}
              <div
                className="flex items-center justify-center rounded-full mx-auto mb-6"
                style={{
                  width: 80,
                  height: 80,
                  background: 'var(--success-bg)',
                  animation: 'scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <Check size={40} style={{ color: 'var(--success)' }} />
              </div>

              <h1 className="font-sans font-bold text-fg-primary mb-3" style={{ fontSize: 28 }}>
                {t('setup.setup_complete')} 🎉
              </h1>
              <p className="text-[15px] text-fg-secondary mb-10 leading-relaxed max-w-md mx-auto">
                Ο χώρος εργασίας TITAN είναι έτοιμος. Μπορείτε τώρα να ξεκινήσετε τη μεταφόρτωση εγγράφων, τη διαμόρφωση κανόνων και τη διαχείριση των εταιρειών σας.
              </p>

              {/* Summary grid */}
              <div className="grid grid-cols-3 gap-4 mb-10 max-w-md mx-auto">
                {[
                  {
                    value: companies.filter((c) => c.name.trim()).length,
                    label: companies.filter((c) => c.name.trim()).length === 1 ? 'Εταιρεία' : 'Εταιρείες',
                    color: 'var(--primary)',
                  },
                  { value: 5, label: 'Φάκελοι Drive', color: 'var(--accent)' },
                  { value: apiConnected ? '✓' : '—', label: 'APIs', color: 'var(--success)' },
                ].map(({ value, label, color }) => (
                  <div key={label}
                    className="rounded-xl border border-border bg-bg-surface p-4"
                    style={{ boxShadow: 'var(--shadow-xs)' }}>
                    <p className="font-sans font-bold mb-0.5" style={{ fontSize: 28, color }}>
                      {value}
                    </p>
                    <p className="text-[12px] text-fg-secondary">{label}</p>
                  </div>
                ))}
              </div>

              <Button
                variant="accent"
                size="lg"
                onClick={handleFinish}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
                {isLoading ? 'Φόρτωση...' : t('setup.go_to_dashboard')}
              </Button>
            </div>
          )}

          {/* ── Navigation buttons ─────────────────────── */}
          {!isLastStep && (
            <div className="flex items-center justify-between mt-10">
              {step > 0 ? (
                <Button variant="outline" onClick={handleBack} disabled={isLoading}>
                  {t('common.back')}
                </Button>
              ) : (
                <div />
              )}

              <Button
                variant="primary"
                onClick={handleNext}
                disabled={isLoading || !canProceedStep1}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                {isLoading
                  ? t('common.loading')
                  : step === TOTAL_STEPS - 2
                  ? t('setup.complete_setup')
                  : t('common.next')}
              </Button>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
