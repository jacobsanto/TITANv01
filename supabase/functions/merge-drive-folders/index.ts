import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { sourceFolderId, targetFolderId } = await req.json()
    if (!sourceFolderId || !targetFolderId) {
      return errorResponse('sourceFolderId and targetFolderId are required')
    }

    const token = await getGoogleToken(supabase, userId, orgId)

    // List all files in source
    const listRes = await driveRequest(
      token,
      `/files?q='${sourceFolderId}'+in+parents+and+trashed=false&fields=files(id,name)&pageSize=1000`
    )
    if (!listRes.ok) throw new Error(`Failed to list source folder: ${listRes.status}`)

    const data = await listRes.json()
    const files: { id: string }[] = data.files ?? []

    let moved = 0
    for (const file of files) {
      const res = await driveRequest(
        token,
        `/files/${file.id}?addParents=${targetFolderId}&removeParents=${sourceFolderId}`,
        { method: 'PATCH' }
      )
      if (res.ok) moved++
    }

    // Delete empty source folder
    await driveRequest(token, `/files/${sourceFolderId}`, { method: 'DELETE' })

    return jsonResponse({ moved })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
