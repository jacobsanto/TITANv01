'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/hooks/useOrg'
import { useT } from '@/lib/i18n/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TIERS, isInternalOrg, type TierKey } from '@/lib/subscription-tiers'
import { Loader2, CheckCircle2, Zap, Building2, Shield } from 'lucide-react'

interface OrgData {
  subscription_tier: TierKey | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  docs_processed_this_month: number
  companies_count: number
  members_count: number
}

const TIER_ICONS = {
  free: Zap,
  pro: Zap,
  enterprise: Shield,
}

const TIER_ORDER: TierKey[] = ['free', 'pro', 'enterprise']

export function SubscriptionView() {
  const t = useT()
  const { orgId, loading: orgLoading, error: orgError } = useOrg()
  const [org, setOrg] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!orgId) return

    async function fetchOrg() {
      setLoading(true)
      try {
        const supabase = createClient()

        const [orgRes, docsRes, companiesRes, membersRes] = await Promise.all([
          supabase
            .from('organizations')
            .select('subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_status')
            .eq('id', orgId)
            .single(),
          supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase
            .from('companies')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId),
          supabase
            .from('organization_members')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId),
        ])

        if (orgRes.error) throw orgRes.error

        setOrg({
          ...orgRes.data,
          docs_processed_this_month: docsRes.count ?? 0,
          companies_count: companiesRes.count ?? 0,
          members_count: membersRes.count ?? 0,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'))
      } finally {
        setLoading(false)
      }
    }

    fetchOrg()
  }, [orgId, t])

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      // Stripe customer portal redirect would be handled by an edge function
      // For now we show a placeholder
      window.open('https://billing.stripe.com/p/login', '_blank')
    } finally {
      setPortalLoading(false)
    }
  }

  if (orgLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 size={32} className="animate-spin text-fg-tertiary" /></div>
  if (orgError || !orgId) return <div className="flex items-center justify-center min-h-[400px] text-fg-tertiary">{orgError ?? t('common.error')}</div>

  const isInternal = isInternalOrg(orgId)
  const currentTier: TierKey = isInternal ? 'enterprise' : (org?.subscription_tier ?? 'free')
  const tier = TIERS[currentTier]

  function usagePercent(used: number, limit: number | typeof Infinity): number {
    if (limit === Infinity) return 0
    return Math.min(100, Math.round((used / limit) * 100))
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 flex items-center px-6 border-b border-border bg-bg-surface" style={{ height: 'var(--header)' }}>
        <h1 className="font-sans font-bold text-fg-primary" style={{ fontSize: 20 }}>{t('subscription.title')}</h1>
      </div>

      <div className="flex-1 p-6 max-w-4xl flex flex-col gap-6">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-error/5 border border-error/20 text-error text-small">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-fg-tertiary" /></div>
        ) : (
          <>
            {/* Current Plan */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-fg-tertiary uppercase tracking-wider">{t('subscription.current_plan')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="font-sans font-bold text-fg-primary" style={{ fontSize: 28 }}>{tier.label}</h2>
                    {isInternal && (
                      <Badge variant="info">{t('subscription.internal_bypass')}</Badge>
                    )}
                    {!isInternal && org?.subscription_status && (
                      <Badge variant={org.subscription_status === 'active' ? 'success' : 'warning'}>
                        {org.subscription_status}
                      </Badge>
                    )}
                  </div>
                  {!isInternal && tier.price > 0 && (
                    <p className="text-fg-secondary text-small">
                      €{tier.price}{t('subscription.per_month')}
                    </p>
                  )}
                  {isInternal && (
                    <p className="text-fg-secondary text-small">Εσωτερική πρόσβαση χωρίς χρέωση</p>
                  )}
                </div>

                {!isInternal && org?.stripe_customer_id && (
                  <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={portalLoading}>
                    {portalLoading && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                    {t('subscription.manage_billing')}
                  </Button>
                )}
              </div>
            </div>

            {/* Usage */}
            <div className="bg-bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <p className="text-[11px] text-fg-tertiary uppercase tracking-wider mb-4">{t('subscription.usage')}</p>
              <div className="flex flex-col gap-4">
                <UsageRow
                  label={`${t('subscription.docs_per_month')}`}
                  used={org?.docs_processed_this_month ?? 0}
                  limit={tier.docs}
                />
                <UsageRow
                  label={t('subscription.companies')}
                  used={org?.companies_count ?? 0}
                  limit={tier.companies}
                />
                <UsageRow
                  label={t('subscription.users')}
                  used={org?.members_count ?? 0}
                  limit={tier.users}
                />
              </div>
            </div>

            {/* Plan Comparison */}
            {!isInternal && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-fg-tertiary uppercase tracking-wider">{t('subscription.upgrade')}</p>
                <div className="grid grid-cols-3 gap-3">
                  {TIER_ORDER.map((key) => {
                    const Icon = TIER_ICONS[key]
                    const tierData = TIERS[key]
                    const isCurrent = key === currentTier

                    return (
                      <div
                        key={key}
                        className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                          isCurrent
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-bg-surface hover:border-border-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Icon size={15} className={isCurrent ? 'text-primary' : 'text-fg-tertiary'} />
                            <span className="font-sans font-semibold text-fg-primary">{tierData.label}</span>
                          </div>
                          {isCurrent && <Badge variant="info">{t('subscription.current_plan')}</Badge>}
                        </div>

                        <p className="font-sans font-bold text-fg-primary" style={{ fontSize: 22 }}>
                          {tierData.price === 0 ? t('subscription.free') : `€${tierData.price}`}
                          {tierData.price > 0 && <span className="text-[13px] font-normal text-fg-tertiary">/μήνα</span>}
                        </p>

                        <ul className="flex flex-col gap-1.5">
                          <FeatureRow value={tierData.docs === Infinity ? t('subscription.unlimited') : `${tierData.docs} ${t('subscription.docs_per_month')}`} />
                          <FeatureRow value={tierData.companies === Infinity ? t('subscription.unlimited') : `${tierData.companies} ${t('subscription.companies')}`} />
                          <FeatureRow value={tierData.users === Infinity ? t('subscription.unlimited') : `${tierData.users} ${t('subscription.users')}`} />
                        </ul>

                        {!isCurrent && (
                          <Button variant="primary" size="sm" className="mt-auto">
                            {currentTier === 'free' || TIER_ORDER.indexOf(key) > TIER_ORDER.indexOf(currentTier)
                              ? t('subscription.upgrade')
                              : t('subscription.downgrade')}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | typeof Infinity }) {
  const t = useT()
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isUnlimited = limit === Infinity

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-small">
        <span className="text-fg-secondary">{label}</span>
        <span className="font-mono text-fg-primary">
          {used.toLocaleString('el-GR')}
          {!isUnlimited && ` / ${limit.toLocaleString('el-GR')}`}
          {isUnlimited && <span className="text-fg-tertiary"> / {t('subscription.unlimited')}</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-error' : pct >= 70 ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function FeatureRow({ value }: { value: string }) {
  return (
    <li className="flex items-center gap-1.5 text-[12px] text-fg-secondary">
      <CheckCircle2 size={12} className="text-success flex-shrink-0" />
      {value}
    </li>
  )
}
