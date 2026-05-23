import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { encryptToken } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { provider_token, provider_refresh_token } = await req.json()
    if (!provider_token) return errorResponse('provider_token is required')

    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const encrypted = await encryptToken(
      {
        access_token: provider_token,
        refresh_token: provider_refresh_token ?? '',
        expiry: Date.now() + 3600 * 1000,
      },
      secret
    )

    await supabase.from('user_settings').upsert([
      {
        org_id: orgId,
        user_id: userId,
        setting_key: 'google_token',
        setting_value: encrypted,
      },
      {
        org_id: orgId,
        user_id: userId,
        setting_key: 'google_token_set',
        setting_value: 'true',
      },
    ], { onConflict: 'org_id,user_id,setting_key' })

    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, msg.includes('token') ? 401 : 500)
  }
})
