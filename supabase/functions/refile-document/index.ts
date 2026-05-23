import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { invoiceId, targetFolderId } = await req.json()
    if (!invoiceId || !targetFolderId) return errorResponse('invoiceId and targetFolderId are required')

    const { data: invoice } = await supabase
      .from('invoices')
      .select('drive_url, filing_path')
      .eq('id', invoiceId)
      .eq('org_id', orgId)
      .single()

    if (!invoice?.drive_url) return errorResponse('Invoice has no Drive URL', 400)

    const token = await getGoogleToken(supabase, userId, orgId)
    const fileIdMatch = invoice.drive_url.match(/[-\w]{25,}/)
    if (!fileIdMatch) return errorResponse('Cannot parse Drive file ID', 400)
    const fileId = fileIdMatch[0]

    // Get current parents to remove
    const metaRes = await driveRequest(token, `/files/${fileId}?fields=parents`)
    const meta = metaRes.ok ? await metaRes.json() : {}
    const removeParents = (meta.parents ?? []).join(',')

    const moveRes = await driveRequest(token, `/files/${fileId}?addParents=${targetFolderId}&removeParents=${removeParents}&fields=id,webViewLink`, {
      method: 'PATCH',
    })

    if (!moveRes.ok) throw new Error(`Drive move failed: ${moveRes.status}`)
    const moved = await moveRes.json()

    await supabase.from('invoices').update({
      drive_url: moved.webViewLink,
      filing_path: targetFolderId,
    }).eq('id', invoiceId)

    return jsonResponse({ ok: true, newUrl: moved.webViewLink })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
