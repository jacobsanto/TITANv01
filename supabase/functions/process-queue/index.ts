import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

async function callSelf(fnName: string, body: Record<string, unknown>, authToken: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.ok ? await res.json() : null
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { orgId, setupId } = await getUserFromRequest(req, supabase)

    const { batchSize = 10 } = await req.json().catch(() => ({}))

    // Grab auth token to pass to sub-functions
    const authHeader = req.headers.get('Authorization') ?? ''

    const { data: items } = await supabase
      .from('processing_queue')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (!items || items.length === 0) {
      return jsonResponse({ processed: 0, failed: 0 })
    }

    let processed = 0
    let failed = 0

    for (const item of items) {
      // Mark as running
      await supabase
        .from('processing_queue')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', item.id)

      try {
        if (item.entity_type === 'invoice') {
          await callSelf('ocr-invoice', {
            driveFileId: item.entity_id,
            setupId,
          }, authHeader.replace('Bearer ', ''))
        }
        // bank_doc processing handled by process-bank-docs directly

        await supabase
          .from('processing_queue')
          .update({ status: 'completed' })
          .eq('id', item.id)

        processed++
      } catch (err) {
        await supabase
          .from('processing_queue')
          .update({
            status: 'failed',
            error_message: err instanceof Error ? err.message : String(err),
          })
          .eq('id', item.id)
        failed++
      }
    }

    return jsonResponse({ processed, failed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
