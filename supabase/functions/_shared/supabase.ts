import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface UserContext {
  userId: string
  orgId: string
  setupId: string | null
}

export async function getUserFromRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<UserContext> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header')
  }
  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    throw new Error('User has no organization')
  }

  const { data: snapshot } = await supabase
    .from('config_snapshots')
    .select('id')
    .eq('org_id', member.org_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    userId: user.id,
    orgId: member.org_id,
    setupId: snapshot?.id ?? null,
  }
}
