import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { orgId, setupId } = await getUserFromRequest(req, supabase)
    const { invoiceIds } = await req.json().catch(() => ({}))
    const authHeader = req.headers.get('Authorization') ?? ''

    let query = supabase
      .from('invoices')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'filed')

    if (setupId) query = query.eq('setup_id', setupId)
    if (invoiceIds?.length) query = query.in('id', invoiceIds)

    const { data: invoices } = await query

    if (!invoices?.length) return jsonResponse({ fixed: 0 })

    // Re-run process-invoices on these specific invoices
    // First reset them to pending so process-invoices will pick them up
    await supabase
      .from('invoices')
      .update({ status: 'pending' })
      .in('id', invoices.map(i => i.id))

    const res = await fetch(`${SUPABASE_URL}/functions/v1/process-invoices`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceIds: invoices.map(i => i.id) }),
    })

    const result = res.ok ? await res.json() : { filed: 0 }
    return jsonResponse({ fixed: result.filed ?? 0 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
