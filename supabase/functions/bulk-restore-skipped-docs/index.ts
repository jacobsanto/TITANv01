import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { docIds } = await req.json() as { docIds: string[] }
    if (!docIds?.length) return errorResponse('docIds is required')

    const { data: docs } = await supabase
      .from('skipped_docs')
      .select('*')
      .in('id', docIds)
      .eq('org_id', orgId)

    if (!docs?.length) return jsonResponse({ restored: 0 })

    const { data: folderSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('setting_key', 'invoice_input_folder_id')
      .maybeSingle()

    const invoiceFolderId = folderSetting?.setting_value

    let restored = 0
    const token = invoiceFolderId ? await getGoogleToken(supabase, userId, orgId) : null

    for (const doc of docs) {
      if (token && doc.drive_url && invoiceFolderId) {
        try {
          const fileIdMatch = doc.drive_url.match(/[-\w]{25,}/)
          if (fileIdMatch) {
            const metaRes = await driveRequest(token, `/files/${fileIdMatch[0]}?fields=parents`)
            const meta = metaRes.ok ? await metaRes.json() : {}
            const removeParents = (meta.parents ?? []).join(',')
            await driveRequest(token, `/files/${fileIdMatch[0]}?addParents=${invoiceFolderId}&removeParents=${removeParents}`, {
              method: 'PATCH',
            })
          }
        } catch { /* non-fatal */ }
      }

      // Re-queue for processing
      await supabase.from('processing_queue').insert({
        org_id: orgId,
        entity_type: 'invoice',
        entity_id: doc.id,
        status: 'pending',
        priority: 1,
      })

      restored++
    }

    // Delete from skipped_docs
    await supabase.from('skipped_docs').delete().in('id', docIds).eq('org_id', orgId)

    return jsonResponse({ restored })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
