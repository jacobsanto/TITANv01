import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId } = await getUserFromRequest(req, supabase)

    const { targetUserId } = await req.json()
    if (!targetUserId) return errorResponse('targetUserId is required')
    if (targetUserId === userId) return errorResponse('Cannot hand over to yourself', 400)

    // Verify caller is super_admin
    const { data: callerMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .single()

    if (callerMember?.role !== 'super_admin') {
      return errorResponse('Only super_admin can perform handover', 403)
    }

    // Verify target is a member
    const { data: targetMember } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('user_id', targetUserId)
      .single()

    if (!targetMember) return errorResponse('Target user is not a member of this organization', 404)

    // Promote target, demote caller
    await Promise.all([
      supabase.from('organization_members')
        .update({ role: 'super_admin' })
        .eq('org_id', orgId)
        .eq('user_id', targetUserId),
      supabase.from('organization_members')
        .update({ role: 'admin' })
        .eq('org_id', orgId)
        .eq('user_id', userId),
    ])

    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'handover_super_admin',
      entity_type: 'organization_members',
      entity_id: targetMember.id,
      details: { fromUserId: userId, toUserId: targetUserId },
    })

    return jsonResponse({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
