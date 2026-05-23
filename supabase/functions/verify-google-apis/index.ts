import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest, gmailRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)
    const token = await getGoogleToken(supabase, userId, orgId)

    const [driveRes, gmailRes] = await Promise.allSettled([
      driveRequest(token, '/about?fields=user'),
      gmailRequest(token, '/users/me/profile'),
    ])

    const driveOk = driveRes.status === 'fulfilled' && driveRes.value.ok
    const gmailOk = gmailRes.status === 'fulfilled' && gmailRes.value.ok

    let email = ''
    if (gmailOk && gmailRes.status === 'fulfilled') {
      const gmailData = await gmailRes.value.json()
      email = gmailData.emailAddress ?? ''
    }

    return jsonResponse({ drive: driveOk, gmail: gmailOk, email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, msg.includes('token') ? 401 : 500)
  }
})
