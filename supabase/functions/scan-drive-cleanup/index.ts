import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  webViewLink?: string
}

async function listAllFiles(
  token: { access_token: string; refresh_token: string },
  folderId: string,
  acc: DriveFile[] = []
): Promise<DriveFile[]> {
  let pageToken: string | undefined
  do {
    const url = `/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,size,webViewLink)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await driveRequest(token, url)
    if (!res.ok) break
    const data = await res.json()
    const files: DriveFile[] = data.files ?? []

    for (const f of files) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        await listAllFiles(token, f.id, acc)
      } else {
        acc.push(f)
      }
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return acc
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)

    const { data: rootSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('setting_key', 'root_folder_id')
      .maybeSingle()

    if (!rootSetting?.setting_value) return errorResponse('root_folder_id not configured', 400)

    const token = await getGoogleToken(supabase, userId, orgId)
    const allFiles = await listAllFiles(token, rootSetting.setting_value)

    // Get all tracked Drive URLs from DB
    const { data: invoices } = await supabase
      .from('invoices')
      .select('original_filename, drive_url')
      .eq('org_id', orgId)

    const trackedNames = new Set((invoices ?? []).map(i => i.original_filename).filter(Boolean))
    const trackedUrls = new Set((invoices ?? []).map(i => i.drive_url).filter(Boolean))

    // Duplicates: same filename appears more than once in Drive
    const nameCounts = new Map<string, DriveFile[]>()
    for (const f of allFiles) {
      const existing = nameCounts.get(f.name) ?? []
      existing.push(f)
      nameCounts.set(f.name, existing)
    }
    const duplicates = [...nameCounts.values()]
      .filter(group => group.length > 1)
      .flat()

    // Orphans: files in Drive not tracked in DB
    const orphans = allFiles.filter(f =>
      !trackedNames.has(f.name) &&
      !trackedUrls.has(f.webViewLink ?? '')
    )

    return jsonResponse({ duplicates, orphans })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
