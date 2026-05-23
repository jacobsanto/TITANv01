import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

interface FolderNode {
  id: string
  name: string
  children: FolderNode[]
}

async function listChildren(
  token: { access_token: string; refresh_token: string },
  folderId: string,
  depth: number,
  maxDepth: number
): Promise<FolderNode[]> {
  if (depth >= maxDepth) return []

  const res = await driveRequest(
    token,
    `/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&pageSize=100`
  )
  if (!res.ok) return []

  const data = await res.json()
  const folders: { id: string; name: string }[] = data.files ?? []

  return Promise.all(
    folders.map(async (f) => ({
      id: f.id,
      name: f.name,
      children: await listChildren(token, f.id, depth + 1, maxDepth),
    }))
  )
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { folderId, depth = 3 } = await req.json()
    if (!folderId) return errorResponse('folderId is required')

    const token = await getGoogleToken(supabase, userId, orgId)

    // Get the root folder name
    const rootRes = await driveRequest(token, `/files/${folderId}?fields=id,name`)
    const root = rootRes.ok ? await rootRes.json() : { id: folderId, name: folderId }

    const children = await listChildren(token, folderId, 0, Math.min(depth, 5))
    const tree: FolderNode = { id: root.id, name: root.name, children }

    return jsonResponse({ tree })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
