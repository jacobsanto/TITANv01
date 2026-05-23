import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { companyId } = await req.json()
    if (!companyId) return errorResponse('companyId is required')

    const { data: company, error } = await supabase
      .from('companies')
      .select('drive_folder_id, name')
      .eq('id', companyId)
      .eq('org_id', orgId)
      .single()

    if (error || !company) return errorResponse('Company not found', 404)
    if (!company.drive_folder_id) {
      return jsonResponse({ exists: false, fileCount: 0, folderName: null })
    }

    const token = await getGoogleToken(supabase, userId, orgId)
    const res = await driveRequest(
      token,
      `/files?q='${company.drive_folder_id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=50`
    )

    if (!res.ok) {
      return jsonResponse({ exists: false, fileCount: 0, folderName: company.name })
    }

    const data = await res.json()
    return jsonResponse({
      exists: true,
      fileCount: data.files?.length ?? 0,
      folderName: company.name,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
