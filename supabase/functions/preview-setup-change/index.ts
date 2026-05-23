import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { orgId, setupId } = await getUserFromRequest(req, supabase)

    const { changes } = await req.json() as {
      changes: { key: string; newValue: string }[]
    }

    const isStructural = changes.some(c =>
      ['root_folder_id', 'invoice_input_folder_id', 'bank_input_folder_id'].includes(c.key)
    )

    if (!setupId) return jsonResponse({ documentsAffected: 0, companiesAffected: 0, details: [], isStructural })

    const [invoicesRes, bankDocsRes, skippedRes, companiesRes] = await Promise.all([
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('setup_id', setupId),
      supabase.from('bank_docs').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('setup_id', setupId),
      supabase.from('skipped_docs').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('setup_id', setupId),
      supabase.from('companies').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('setup_id', setupId),
    ])

    const documentsAffected = (invoicesRes.count ?? 0) + (bankDocsRes.count ?? 0) + (skippedRes.count ?? 0)
    const companiesAffected = companiesRes.count ?? 0

    return jsonResponse({
      documentsAffected,
      companiesAffected,
      isStructural,
      details: changes.map(c => ({ key: c.key, newValue: c.newValue })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
