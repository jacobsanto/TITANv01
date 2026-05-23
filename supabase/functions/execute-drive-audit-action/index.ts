import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { flagId, action, params } = await req.json() as {
      flagId: string
      action: 'create_folder' | 'move' | 'dismiss'
      params?: Record<string, string>
    }

    if (!flagId || !action) return errorResponse('flagId and action are required')

    const { data: flag } = await supabase
      .from('system_flags')
      .select('*')
      .eq('id', flagId)
      .eq('org_id', orgId)
      .single()

    if (!flag) return errorResponse('Flag not found', 404)

    if (action === 'create_folder' && params?.parentId && params?.name) {
      const token = await getGoogleToken(supabase, userId, orgId)
      const res = await driveRequest(token, '/files', {
        method: 'POST',
        body: JSON.stringify({
          name: params.name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [params.parentId],
        }),
      })
      if (!res.ok) throw new Error(`Failed to create folder: ${res.status}`)

      const created = await res.json()
      // Update company drive_folder_id if applicable
      if (flag.entity_type === 'companies' && flag.entity_id) {
        await supabase
          .from('companies')
          .update({ drive_folder_id: created.id })
          .eq('id', flag.entity_id)
      }
    }
    // 'move' and 'dismiss' just resolve the flag

    await supabase
      .from('system_flags')
      .update({ resolved: true })
      .eq('id', flagId)

    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
