import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { TIERS } from '@/lib/subscription-tiers'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { priceId } = await req.json()
    if (!priceId) return NextResponse.json({ error: 'priceId is required' }, { status: 400 })

    // Validate priceId belongs to a known tier
    const validPriceIds = Object.values(TIERS).map(t => t.priceId)
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid priceId' }, { status: 400 })
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!member) return NextResponse.json({ error: 'No organization found' }, { status: 404 })

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', member.org_id)
      .single()

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

    let customerId = org?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name,
        metadata: { org_id: member.org_id },
      })
      customerId = customer.id
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', member.org_id)
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/subscription?success=1`,
      cancel_url: `${origin}/subscription?cancelled=1`,
      metadata: { org_id: member.org_id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
