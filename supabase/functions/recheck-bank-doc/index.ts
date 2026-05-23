import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { orgId, setupId } = await getUserFromRequest(req, supabase)

    const { bankDocId } = await req.json()
    if (!bankDocId) return errorResponse('bankDocId is required')

    const { data: doc, error } = await supabase
      .from('bank_docs')
      .select('*')
      .eq('id', bankDocId)
      .eq('org_id', orgId)
      .single()

    if (error || !doc) return errorResponse('Bank doc not found', 404)

    const { data: bankRules } = await supabase
      .from('bank_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('setup_id', setupId ?? doc.setup_id)

    const matchedRule = (bankRules ?? []).find(rule => {
      if (rule.account_last8 && doc.description?.includes(rule.account_last8)) return true
      if (rule.iban && doc.description?.includes(rule.iban)) return true
      if (rule.bank_name && doc.description?.toLowerCase().includes(rule.bank_name.toLowerCase())) return true
      return false
    })

    const status = matchedRule ? 'matched' : 'unmatched'
    await supabase.from('bank_docs').update({ status, needs_review: !matchedRule }).eq('id', bankDocId)

    return jsonResponse({ bankDocId, status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
