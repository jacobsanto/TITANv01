import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

const INTERNAL_ORG_ID = Deno.env.get('INTERNAL_ORG_ID') ?? '6ad9aa97-ccc0-4c7b-9b8b-5c26ab3ccc3b'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    if (orgId !== INTERNAL_ORG_ID) {
      return errorResponse('Not authorized for this operation', 403)
    }

    const { data: job, error } = await supabase
      .from('job_runs')
      .insert({
        org_id: orgId,
        job_type: 'backup',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { initiatedBy: userId },
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)

    // Note: actual pg_dump/Supabase Management API backup is triggered
    // asynchronously via a cron job or platform backup. This records intent.
    await supabase.from('job_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', job!.id)

    return jsonResponse({ jobId: job!.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
