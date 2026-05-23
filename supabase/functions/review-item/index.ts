import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { entityType, entityId, action, notes } = await req.json() as {
      entityType: 'invoice' | 'bank_doc'
      entityId: string
      action: 'approve' | 'reject'
      notes?: string
    }

    if (!entityType || !entityId || !action) {
      return errorResponse('entityType, entityId, and action are required')
    }

    if (entityType === 'invoice') {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('drive_url, setup_id, company_id, original_filename')
        .eq('id', entityId)
        .eq('org_id', orgId)
        .single()

      if (action === 'approve') {
        await supabase.from('invoices').update({
          needs_review: false,
          reviewed_by: userId,
          status: 'filed',
        }).eq('id', entityId).eq('org_id', orgId)
      } else {
        // Move to trash in Drive
        if (invoice?.drive_url) {
          try {
            const token = await getGoogleToken(supabase, userId, orgId)
            const fileIdMatch = invoice.drive_url.match(/[-\w]{25,}/)

            // Get trash folder
            const { data: trashSetting } = await supabase
              .from('user_settings')
              .select('setting_value')
              .eq('user_id', userId)
              .eq('org_id', orgId)
              .eq('setting_key', 'trash_folder_id')
              .maybeSingle()

            if (fileIdMatch && trashSetting?.setting_value) {
              await driveRequest(token, `/files/${fileIdMatch[0]}`, {
                method: 'PATCH',
                body: JSON.stringify({ parents: [trashSetting.setting_value] }),
              })
            }
          } catch { /* non-fatal */ }
        }

        await supabase.from('invoices').update({
          needs_review: false,
          reviewed_by: userId,
          status: 'skipped',
        }).eq('id', entityId).eq('org_id', orgId)

        await supabase.from('skipped_docs').insert({
          org_id: orgId,
          setup_id: invoice?.setup_id ?? null,
          company_id: invoice?.company_id ?? null,
          original_filename: invoice?.original_filename ?? null,
          drive_url: invoice?.drive_url ?? null,
          reason: notes ?? 'Rejected in review',
        })
      }
    } else if (entityType === 'bank_doc') {
      const status = action === 'approve' ? 'matched' : 'unmatched'
      await supabase.from('bank_docs').update({
        needs_review: false,
        status,
      }).eq('id', entityId).eq('org_id', orgId)
    }

    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: `review_${action}`,
      entity_type: entityType === 'invoice' ? 'invoices' : 'bank_docs',
      entity_id: entityId,
      details: { action, notes: notes ?? null },
    })

    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
