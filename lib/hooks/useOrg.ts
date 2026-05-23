'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface OrgContext {
  orgId: string | null
  setupId: string | null
  loading: boolean
  error: string | null
}

export function useOrg(): OrgContext {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [setupId, setSetupId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchOrg() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || cancelled) {
          setLoading(false)
          return
        }

        const { data: member, error: memberError } = await supabase
          .from('organization_members')
          .select('org_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (memberError) throw memberError
        if (!member?.org_id || cancelled) {
          setLoading(false)
          return
        }

        if (!cancelled) setOrgId(member.org_id)

        const { data: snapshot, error: snapshotError } = await supabase
          .from('config_snapshots')
          .select('id')
          .eq('org_id', member.org_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (snapshotError) throw snapshotError
        if (!cancelled) {
          setSetupId(snapshot?.id ?? null)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load org context')
          setLoading(false)
        }
      }
    }

    fetchOrg()
    return () => {
      cancelled = true
    }
  }, [])

  return { orgId, setupId, loading, error }
}
