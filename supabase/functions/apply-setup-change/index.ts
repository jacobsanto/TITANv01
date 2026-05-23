import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { createServiceClient, getUserFromRequest } from '../_shared/supabase.ts'

const CONFIG_TABLES = [
  'bank_rules', 'naming_rules', 'filing_flows',
  'rules_engine', 'supplier_aliases', 'extraction_prompts',
] as const

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = createServiceClient()
    const { userId, orgId, setupId } = await getUserFromRequest(req, supabase)
    if (!setupId) return errorResponse('No active setup found', 400)

    const { changes, notes } = await req.json() as {
      changes: { key: string; newValue: string }[]
      notes?: string
    }

    // Get current snapshot
    const { data: currentSnap } = await supabase
      .from('config_snapshots')
      .select('snapshot, name')
      .eq('id', setupId)
      .single()

    // Create new snapshot
    const { data: newSnap, error: snapError } = await supabase
      .from('config_snapshots')
      .insert({
        org_id: orgId,
        name: `${currentSnap?.name ?? 'Setup'} (updated)`,
        is_active: true,
        snapshot: currentSnap?.snapshot ?? {},
        created_by: userId,
        notes: notes ?? null,
      })
      .select('id')
      .single()

    if (snapError || !newSnap) throw new Error('Failed to create snapshot')

    // Deactivate old snapshot
    await supabase
      .from('config_snapshots')
      .update({ is_active: false })
      .eq('id', setupId)

    // Copy config table rows to new snapshot
    for (const table of CONFIG_TABLES) {
      const { data: rows } = await supabase
        .from(table)
        .select('*')
        .eq('org_id', orgId)
        .eq('setup_id', setupId)

      if (rows && rows.length > 0) {
        const newRows = rows.map(({ id: _id, created_at: _ca, ...rest }) => ({
          ...rest,
          setup_id: newSnap.id,
        }))
        await supabase.from(table).insert(newRows)
      }
    }

    // Migrate user_settings to new setup_id
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('org_id', orgId)
      .eq('setup_id', setupId)

    if (settings && settings.length > 0) {
      // Build upsert with new setup_id, applying changes
      const changeMap = Object.fromEntries(changes.map(c => [c.key, c.newValue]))
      const newSettings = settings.map(s => ({
        ...s,
        setup_id: newSnap.id,
        setting_value: changeMap[s.setting_key] ?? s.setting_value,
      }))
      await supabase.from('user_settings').upsert(newSettings, {
        onConflict: 'org_id,user_id,setting_key',
      })
    }

    // Apply changes for settings not previously present
    const existingKeys = new Set((settings ?? []).map(s => s.setting_key))
    const newEntries = changes
      .filter(c => !existingKeys.has(c.key))
      .map(c => ({
        org_id: orgId,
        user_id: userId,
        setup_id: newSnap.id,
        setting_key: c.key,
        setting_value: c.newValue,
      }))
    if (newEntries.length > 0) {
      await supabase.from('user_settings').upsert(newEntries, {
        onConflict: 'org_id,user_id,setting_key',
      })
    }

    // Audit log
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'apply_setup_change',
      entity_type: 'config_snapshots',
      entity_id: newSnap.id,
      details: { previousSetupId: setupId, changes },
    })

    return jsonResponse({ newSetupId: newSnap.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return errorResponse(msg, 500)
  }
})
