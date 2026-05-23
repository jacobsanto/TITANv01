import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'
import { getGoogleToken, driveRequest } from '../_shared/google.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)
    if (!setupId) return errorResponse('No active setup', 400)

    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, drive_folder_id')
      .eq('org_id', orgId)
      .eq('setup_id', setupId)
      .eq('is_active', true)

    const token = await getGoogleToken(supabase, userId, orgId)
    let audited = 0
    let flags = 0

    for (const company of companies ?? []) {
      audited++
      if (!company.drive_folder_id) {
        await supabase.from('system_flags').insert({
          org_id: orgId,
          flag_type: 'missing_drive_folder',
          severity: 'warning',
          entity_type: 'companies',
          entity_id: company.id,
          message: `Company "${company.name}" has no Drive folder configured`,
          resolved: false,
        })
        flags++
        continue
      }

      // Check folder exists
      const res = await driveRequest(token, `/files/${company.drive_folder_id}?fields=id,name,trashed`)
      if (!res.ok || (await res.clone().json()).trashed) {
        await supabase.from('system_flags').insert({
          org_id: orgId,
          flag_type: 'drive_folder_missing',
          severity: 'critical',
          entity_type: 'companies',
          entity_id: company.id,
          message: `Drive folder for company "${company.name}" not found or trashed`,
          details: { folderId: company.drive_folder_id },
          resolved: false,
        })
        flags++
      }
    }

    return jsonResponse({ audited, flags })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
