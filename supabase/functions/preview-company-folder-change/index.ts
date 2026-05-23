import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { orgId, setupId } = await getUserFromRequest(req, supabase)

    const { companyId, newFolderId } = await req.json()
    if (!companyId) return errorResponse('companyId is required')

    const [invoicesRes, bankDocsRes] = await Promise.all([
      supabase.from('invoices').select('id', { count: 'exact', head: true })
        .eq('org_id', orgId).eq('company_id', companyId),
      supabase.from('bank_docs').select('id', { count: 'exact', head: true })
        .eq('org_id', orgId).eq('company_id', companyId),
    ])

    const documentsAffected = (invoicesRes.count ?? 0) + (bankDocsRes.count ?? 0)

    return jsonResponse({
      documentsAffected,
      companiesAffected: 1,
      companyId,
      newFolderId: newFolderId ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
