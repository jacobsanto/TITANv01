export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <DashboardShell userEmail={user?.email}>
      {children}
    </DashboardShell>
  )
}
