import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

async function copyFolderStructure(
  token: { access_token: string; refresh_token: string },
  sourceFolderId: string,
  targetParentId: string,
  folderName: string
): Promise<string> {
  // Create the folder at target
  const createRes = await driveRequest(token, '/files', {
    method: 'POST',
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [targetParentId],
    }),
  })
  if (!createRes.ok) throw new Error(`Failed to create folder: ${createRes.status}`)
  const created = await createRes.json()
  const newFolderId: string = created.id

  // List subfolders and recurse
  const listRes = await driveRequest(
    token,
    `/files?q='${sourceFolderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&pageSize=100`
  )
  if (listRes.ok) {
    const data = await listRes.json()
    for (const sub of (data.files ?? []) as { id: string; name: string }[]) {
      await copyFolderStructure(token, sub.id, newFolderId, sub.name)
    }
  }

  return newFolderId
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { sourceFolderId, targetParentId, newName } = await req.json()
    if (!sourceFolderId || !targetParentId) {
      return errorResponse('sourceFolderId and targetParentId are required')
    }

    const token = await getGoogleToken(supabase, userId, orgId)

    // Get source folder name
    const metaRes = await driveRequest(token, `/files/${sourceFolderId}?fields=name`)
    const meta = metaRes.ok ? await metaRes.json() : { name: 'Copy' }
    const folderName = newName ?? `${meta.name} (copy)`

    const newFolderId = await copyFolderStructure(token, sourceFolderId, targetParentId, folderName)
    return jsonResponse({ newFolderId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
