import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { companyId, newFolderId } = await req.json()
    if (!companyId || !newFolderId) return errorResponse('companyId and newFolderId are required')

    const { error } = await supabase
      .from('companies')
      .update({ drive_folder_id: newFolderId })
      .eq('id', companyId)
      .eq('org_id', orgId)

    if (error) throw new Error(error.message)

    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'apply_company_folder_change',
      entity_type: 'companies',
      entity_id: companyId,
      details: { newFolderId },
    })

    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
