import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    // Attempt to revoke with Google (best-effort)
    try {
      const token = await getGoogleToken(supabase, userId, orgId)
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${token.access_token}`,
        { method: 'POST' }
      )
    } catch {
      // Token may already be expired — still delete locally
    }

    await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .in('setting_key', ['google_token', 'google_token_set'])

    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
