import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AnalyticsView } from './_components/analytics-view'

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get workspace with team info
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id, name, team_id, teams!inner(subscription_plan)')
    .eq('id', id)
    .single()

  if (error || !workspace) {
    notFound()
  }

  // Check if user has access to this workspace's team
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', workspace.team_id)
    .eq('user_id', user.id)
    .single()

  if (!teamMember) {
    redirect('/dashboard')
  }

  // Check if team has Pro subscription for custom dashboards
  const teamData = workspace.teams as { subscription_plan?: string } | null
  const isPro = teamData?.subscription_plan === 'pro' || teamData?.subscription_plan === 'enterprise'

  return (
    <AnalyticsView
      workspaceId={workspace.id}
      teamId={workspace.team_id}
      workspaceName={workspace.name}
      isPro={isPro}
    />
  )
}
