import Link from 'next/link'
import {
  ArrowRight,
  Play,
  Lock,
  Smartphone,
  Building2,
  Landmark,
  FolderOpen,
  BarChart3,
  Zap,
  Check,
  X,
} from 'lucide-react'
import { TitanLogo } from '@/components/layout/titan-logo'
import { tServer } from '@/lib/i18n/server'

const t = (key: string) => tServer(key)

const features = [
  {
    icon: Smartphone,
    title: 'Αυτόματο OCR + Εξαγωγή',
    description:
      'Σκαναρέτε τιμολόγια και αποδείξεις από το κινητό σας. Αυτόματη εξαγωγή ΑΦΜ, ποσών, ημερομηνιών και δεδομένων προμηθευτή με AI.',
    color: 'primary' as const,
  },
  {
    icon: Building2,
    title: 'Υποστήριξη Πολλών Εταιρειών',
    description:
      'Διαχειριστείτε 10, 50 ή 100+ εταιρείες από ένα dashboard. Ξεχωριστοί φάκελοι Drive, κανόνες ονομασίας και ροές αρχειοθέτησης ανά οντότητα.',
    color: 'accent' as const,
  },
  {
    icon: Landmark,
    title: 'Συμφωνία Τράπεζας',
    description:
      'Αντιστοιχίστε αυτόματα τραπεζικές συναλλαγές με τιμολόγια. Προσαρμοσμένοι κανόνες, ψευδώνυμα προμηθευτών και διαχείριση εξαιρέσεων.',
    color: 'success' as const,
  },
  {
    icon: FolderOpen,
    title: 'Οργάνωση Google Drive',
    description:
      'Αυτόματη αρχειοθέτηση σε δομημένους φακέλους. Ανίχνευση διπλοτύπων και εκκαθάριση ορφανών αρχείων ενσωματωμένα.',
    color: 'info' as const,
  },
  {
    icon: BarChart3,
    title: 'Συμμόρφωση myDATA',
    description:
      'Αναφορές ΦΠΑ, παρακρατούμενος φόρος, παρακολούθηση συμμόρφωσης πληρωμών. Μορφές εξαγωγής έτοιμες για λογιστικές ροές ΑΑΔΕ.',
    color: 'warning' as const,
  },
  {
    icon: Zap,
    title: 'Μηχανή Κανόνων',
    description:
      'Δημιουργήστε προσαρμοσμένους κανόνες αυτοματισμού: κατηγοριοποίηση ανά προμηθευτή, σήμανση υψηλής αξίας, ενεργοποίηση ουρών αναθεώρησης.',
    color: 'error' as const,
  },
]

const iconColorMap = {
  primary: { bg: 'rgba(26,58,92,0.1)', color: '#1A3A5C' },
  accent: { bg: 'rgba(196,149,106,0.15)', color: '#C4956A' },
  success: { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
  info: { bg: 'rgba(43,122,158,0.1)', color: '#2B7A9E' },
  warning: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  error: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626' },
}

const pricingTiers = [
  {
    key: 'free',
    name: 'Free',
    price: '€0',
    description: 'Για άτομα ή δοκιμή μίας εταιρείας',
    features: [
      { label: '1 εταιρεία', included: true },
      { label: '50 έγγραφα/μήνα', included: true },
      { label: 'Βασικό OCR', included: true },
      { label: 'Google Drive Sync', included: true },
      { label: 'Email support', included: true },
      { label: 'Πολλές εταιρείες', included: false },
      { label: 'Συμφωνία τράπεζας', included: false },
    ],
    cta: 'Ξεκινήστε Δωρεάν',
    featured: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '€29',
    description: 'Για λογιστές που διαχειρίζονται πολλούς πελάτες',
    features: [
      { label: 'Έως 10 εταιρείες', included: true },
      { label: '700 έγγραφα/μήνα', included: true },
      { label: 'Σύνθετο OCR + AI', included: true },
      { label: 'Συμφωνία τράπεζας', included: true },
      { label: 'Προσαρμοσμένοι κανόνες', included: true },
      { label: 'Αναφορές myDATA', included: true },
      { label: 'Priority support', included: true },
    ],
    cta: 'Δοκιμάστε Pro',
    featured: true,
    badge: 'Πιο Δημοφιλές',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: '€79',
    description: 'Για μεγάλα γραφεία και λογιστικές εταιρείες',
    features: [
      { label: 'Απεριόριστες εταιρείες', included: true },
      { label: 'Απεριόριστα έγγραφα', included: true },
      { label: 'Όλα του Pro', included: true },
      { label: 'Ομαδική συνεργασία', included: true },
      { label: 'Σύνθετη μηχανή κανόνων', included: true },
      { label: 'Audit log & compliance', included: true },
      { label: 'Dedicated support', included: true },
    ],
    cta: 'Επικοινωνία',
    featured: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen font-body">
      {/* ── Navigation ──────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12"
        style={{ height: 72, background: 'rgba(15,30,46,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <TitanLogo size="default" showWordmark />
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[14px] text-white/70 hover:text-white transition-colors">
            {t('landing.features')}
          </a>
          <a href="#pricing" className="text-[14px] text-white/70 hover:text-white transition-colors">
            {t('landing.pricing')}
          </a>
        </nav>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-[14px] font-semibold font-sans transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {t('landing.sign_in')}
        </Link>
      </header>

      {/* ── Hero ──────────────────────────────────────── */}
      <section
        className="relative flex items-center overflow-hidden"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0F1E2E 0%, #1A3A5C 50%, #1B4F72 100%)',
          paddingTop: 72,
        }}
      >
        {/* Decorative overlays */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(196,149,106,0.12) 0%, transparent 60%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative w-full max-w-[1200px] mx-auto px-6 md:px-12 py-24 md:py-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-pill text-[12px] font-semibold font-sans"
            style={{ background: 'rgba(196,149,106,0.15)', color: '#C4956A', border: '1px solid rgba(196,149,106,0.25)' }}>
            <Lock size={12} />
            myDATA &amp; ΑΑΔΕ Compliant
          </div>

          {/* Tagline */}
          <p className="text-[13px] font-semibold font-sans uppercase tracking-[0.2em] mb-3"
            style={{ color: '#C4956A' }}>
            {t('landing.hero_title').split(' ').slice(0, 2).join(' ')}
          </p>

          {/* Headline */}
          <h1
            className="font-display font-medium text-white mb-6 leading-tight"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', maxWidth: 720 }}
          >
            Αυτοματοποιημένη Διαχείριση Λογιστικών Εγγράφων
          </h1>

          {/* Description */}
          <p className="text-[16px] leading-relaxed mb-10"
            style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 560 }}>
            {t('landing.hero_subtitle')}. Υποστήριξη πολλών εταιρειών με ευφυή συμφωνία τράπεζας.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 font-sans font-semibold rounded-lg transition-all duration-150"
              style={{
                height: 52,
                padding: '0 28px',
                fontSize: 15,
                background: '#C4956A',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(196,149,106,0.35)',
              }}
            >
              {t('landing.get_started')}
              <ArrowRight size={18} />
            </Link>
            <button
              className="inline-flex items-center gap-2 font-sans font-semibold rounded-lg transition-all duration-150"
              style={{
                height: 52,
                padding: '0 24px',
                fontSize: 15,
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Play size={16} />
              Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section id="features" className="py-24 bg-bg-surface">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-label font-semibold font-sans uppercase tracking-widest mb-3"
              style={{ color: '#C4956A' }}>
              Core Capabilities
            </p>
            <h2 className="font-sans font-bold text-fg-primary mb-4"
              style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}>
              Φτιαγμένο για Ελληνικές Λογιστικές Ομάδες
            </h2>
            <p className="text-[16px] text-fg-secondary mx-auto" style={{ maxWidth: 560 }}>
              Όλα όσα χρειάζεστε για τη διαχείριση λογιστικών εγγράφων σε πολλές εταιρείες, με πλήρη ενσωμάτωση myDATA.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {features.map(({ icon: Icon, title, description, color }) => {
              const colors = iconColorMap[color]
              return (
                <div
                  key={title}
                  className="p-6 rounded-xl border border-border bg-bg-surface transition-all duration-250 hover:-translate-y-1 hover:shadow-lg cursor-default"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  <div
                    className="flex items-center justify-center rounded-xl mb-4"
                    style={{ width: 48, height: 48, background: colors.bg }}
                  >
                    <Icon size={24} style={{ color: colors.color }} />
                  </div>
                  <h3 className="font-sans font-semibold text-fg-primary mb-2" style={{ fontSize: 18 }}>
                    {title}
                  </h3>
                  <p className="text-[14px] text-fg-secondary leading-relaxed">{description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-bg">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-label font-semibold font-sans uppercase tracking-widest mb-3"
              style={{ color: '#C4956A' }}>
              {t('subscription.title')}
            </p>
            <h2 className="font-sans font-bold text-fg-primary mb-4"
              style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}>
              Απλή, Διαφανής Τιμολόγηση
            </h2>
            <p className="text-[16px] text-fg-secondary">
              Ξεκινήστε δωρεάν. Αναβαθμίστε όταν χρειαστεί.
            </p>
          </div>

          {/* Pricing grid */}
          <div className="flex flex-wrap justify-center gap-6 items-center">
            {pricingTiers.map((tier) => (
              <div
                key={tier.key}
                className="relative flex flex-col rounded-xl border bg-bg-surface transition-all duration-250"
                style={{
                  width: '100%',
                  maxWidth: 340,
                  minWidth: 280,
                  padding: 32,
                  boxShadow: tier.featured ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  borderColor: tier.featured ? '#C4956A' : 'var(--border)',
                  transform: tier.featured ? 'scale(1.04)' : 'none',
                  zIndex: tier.featured ? 1 : 0,
                }}
              >
                {tier.badge && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-pill text-[11px] font-semibold font-sans text-white"
                    style={{ background: '#C4956A' }}
                  >
                    {tier.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-sans font-bold text-fg-primary mb-1" style={{ fontSize: 22 }}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="font-sans font-bold text-fg-primary" style={{ fontSize: 40 }}>
                      {tier.price}
                    </span>
                    <span className="text-[14px] text-fg-secondary">/μήνα</span>
                  </div>
                  <p className="text-[14px] text-fg-secondary">{tier.description}</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {tier.features.map(({ label, included }) => (
                    <li key={label} className="flex items-center gap-2.5">
                      {included ? (
                        <Check size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                      ) : (
                        <X size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                      )}
                      <span
                        className="text-[14px]"
                        style={{ color: included ? 'var(--fg-primary)' : 'var(--fg-tertiary)' }}
                      >
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className="flex items-center justify-center h-11 rounded-lg font-sans font-semibold text-[14px] transition-all duration-150"
                  style={
                    tier.featured
                      ? { background: '#C4956A', color: '#fff', boxShadow: '0 4px 12px rgba(196,149,106,0.3)' }
                      : { background: 'var(--bg-alt)', color: 'var(--fg-primary)', border: '1px solid var(--border)' }
                  }
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────── */}
      <section
        className="py-24 text-center"
        style={{ background: 'linear-gradient(135deg, #1A3A5C 0%, #1B4F72 100%)' }}
      >
        <div className="max-w-[700px] mx-auto px-6">
          <h2 className="font-display font-medium text-white mb-4"
            style={{ fontSize: 'clamp(28px, 3vw, 40px)' }}>
            Έτοιμοι να αυτοματοποιήσετε τη λογιστική σας;
          </h2>
          <p className="text-[16px] mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Ξεκινήστε με το δωρεάν πλάνο. Δεν απαιτείται πιστωτική κάρτα.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 font-sans font-semibold rounded-lg transition-all duration-150"
            style={{
              height: 52,
              padding: '0 32px',
              fontSize: 15,
              background: '#C4956A',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(196,149,106,0.35)',
            }}
          >
            {t('landing.get_started')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-10 px-6 md:px-12 bg-bg-navy">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <TitanLogo size="sm" />
            <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Financial OS by Arivia Group
            </span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Documentation', 'Contact'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[13px] text-white/40 hover:text-white/80 transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            🇬🇷 Built for Greek accounting teams
          </p>
        </div>
      </footer>
    </div>
  )
}
