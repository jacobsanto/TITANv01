import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { query, folderId } = await req.json()
    if (!query) return errorResponse('query is required')

    const token = await getGoogleToken(supabase, userId, orgId)

    let q = `name contains '${query.replace(/'/g, "\\'")}' and trashed=false`
    if (folderId) q += ` and '${folderId}' in parents`

    const res = await driveRequest(
      token,
      `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&pageSize=50`
    )

    if (!res.ok) throw new Error(`Drive search failed: ${res.status}`)
    const data = await res.json()

    return jsonResponse({ files: data.files ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
