import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, gmailRequest, driveRequest, uploadToDrive } from '../_shared/google.ts'

const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)

    const body = await req.json()
    const gmailQuery: string = body.gmailQuery ?? ''

    // Get invoice_input_folder_id from user_settings
    const { data: folderSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('setting_key', 'invoice_input_folder_id')
      .maybeSingle()

    if (!folderSetting?.setting_value) {
      return errorResponse('invoice_input_folder_id not configured in settings', 400)
    }
    const invoiceFolderId = folderSetting.setting_value

    // Get stored Gmail search queries
    const { data: searchSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('setting_key', 'gmail_search_query')
      .maybeSingle()

    const query = gmailQuery || searchSetting?.setting_value || 'has:attachment filename:pdf subject:(invoice OR τιμολόγιο)'

    const token = await getGoogleToken(supabase, userId, orgId)

    // List messages matching query
    const listRes = await gmailRequest(
      token,
      `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`
    )
    if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`)

    const listData = await listRes.json()
    const messages: { id: string }[] = listData.messages ?? []

    let fetched = 0
    let queued = 0

    for (const msg of messages) {
      // Get full message to find attachments
      const msgRes = await gmailRequest(token, `/users/me/messages/${msg.id}?format=full`)
      if (!msgRes.ok) continue
      const msgData = await msgRes.json()

      const parts: { filename?: string; mimeType?: string; body?: { attachmentId?: string; size?: number } }[] =
        flattenParts(msgData.payload?.parts ?? [])

      for (const part of parts) {
        if (!part.filename || !part.body?.attachmentId) continue
        if (!ATTACHMENT_MIME_TYPES.includes(part.mimeType ?? '')) continue

        // Download attachment
        const attRes = await gmailRequest(
          token,
          `/users/me/messages/${msg.id}/attachments/${part.body.attachmentId}`
        )
        if (!attRes.ok) continue
        const attData = await attRes.json()
        const base64 = attData.data.replace(/-/g, '+').replace(/_/g, '/')
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

        // Upload to Drive
        const uploaded = await uploadToDrive(
          token,
          part.filename,
          bytes,
          part.mimeType ?? 'application/pdf',
          invoiceFolderId
        )

        // Insert into processing_queue
        await supabase.from('processing_queue').insert({
          org_id: orgId,
          entity_type: 'invoice',
          entity_id: uploaded.id,
          status: 'pending',
          priority: 0,
        })

        fetched++
        queued++
      }
    }

    return jsonResponse({ fetched, queued })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})

function flattenParts(parts: unknown[]): { filename?: string; mimeType?: string; body?: { attachmentId?: string } }[] {
  const result: { filename?: string; mimeType?: string; body?: { attachmentId?: string } }[] = []
  for (const part of parts as { filename?: string; mimeType?: string; body?: { attachmentId?: string }; parts?: unknown[] }[]) {
    result.push(part)
    if (part.parts) result.push(...flattenParts(part.parts))
  }
  return result
}
