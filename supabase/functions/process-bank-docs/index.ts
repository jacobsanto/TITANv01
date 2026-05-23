import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { orgId, setupId } = await getUserFromRequest(req, supabase)
    if (!setupId) return errorResponse('No active setup', 400)

    const { batchSize = 20 } = await req.json().catch(() => ({}))

    const [{ data: bankDocs }, { data: bankRules }] = await Promise.all([
      supabase
        .from('bank_docs')
        .select('*')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)
        .eq('status', 'pending')
        .limit(batchSize),
      supabase
        .from('bank_rules')
        .select('*')
        .eq('org_id', orgId)
        .eq('setup_id', setupId),
    ])

    if (!bankDocs?.length) return jsonResponse({ processed: 0, matched: 0, unmatched: 0 })

    let processed = 0
    let matched = 0
    let unmatched = 0

    for (const doc of bankDocs) {
      // Try to match against bank_rules
      const matchedRule = (bankRules ?? []).find(rule => {
        if (rule.account_last8 && doc.description?.includes(rule.account_last8)) return true
        if (rule.iban && doc.description?.includes(rule.iban)) return true
        if (rule.bank_name && doc.description?.toLowerCase().includes(rule.bank_name.toLowerCase())) return true
        return false
      })

      const status = matchedRule ? 'matched' : 'unmatched'
      const needsReview = !matchedRule

      await supabase.from('bank_docs').update({
        status,
        needs_review: needsReview,
      }).eq('id', doc.id)

      if (matchedRule) matched++
      else unmatched++
      processed++
    }

    return jsonResponse({ processed, matched, unmatched })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
