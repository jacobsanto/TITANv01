export const TIERS = {
  free: {
    label: 'Free',
    price: 0,
    users: 1,
    docs: 50,
    companies: 1,
    priceId: 'price_1TKwjvCZ65TIMnxL9h4wfaLZ',
  },
  pro: {
    label: 'Pro',
    price: 29,
    users: 5,
    docs: 700,
    companies: 10,
    priceId: 'price_1TKwkbCZ65TIMnxLXdRxCaY5',
  },
  enterprise: {
    label: 'Enterprise',
    price: 79,
    users: Infinity,
    docs: Infinity,
    companies: Infinity,
    priceId: 'price_1TKwkxCZ65TIMnxLFvxTnziD',
  },
} as const

export type TierKey = keyof typeof TIERS

export const INTERNAL_ORG_ID = '6ad9aa97-ccc0-4c7b-9b8b-5c26ab3ccc3b'
export const INTERNAL_EMAIL = 'iakovos@ariviagroup.com'

export function isInternalOrg(orgId: string): boolean {
  return orgId === INTERNAL_ORG_ID
}

export function getEffectiveTier(orgId: string): TierKey {
  if (isInternalOrg(orgId)) return 'enterprise'
  return 'free'
}
