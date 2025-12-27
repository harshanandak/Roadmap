import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InsightsDashboard } from '@/components/insights/insights-dashboard'

interface InsightsPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

/**
 * Insights Dashboard Page
 *
 * Full-featured page for managing customer insights:
 * - Overview stats
 * - Filterable list
 * - Triage queue
 * - Detail views
 *
 * Route: /workspaces/[id]/insights
 */
export default async function InsightsPage({
  params,
  searchParams,
}: InsightsPageProps) {
  const { id: workspaceId } = await params
  const { tab } = await searchParams

  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch workspace with team info
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('id, name, team_id')
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) {
    redirect('/workspaces')
  }

  // Verify user has access to this team
  const { data: membership } = await supabase
    .from('team_members')
    .select('id, role')
    .eq('team_id', workspace.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/workspaces')
  }

  // Validate tab parameter
  const validTabs = ['all', 'triage', 'linked'] as const
  type ValidTab = typeof validTabs[number]
  const isValidTab = (value: string | undefined): value is ValidTab =>
    validTabs.includes(value as ValidTab)
  const initialTab: ValidTab = isValidTab(tab) ? tab : 'all'

  return (
    <div className="container max-w-7xl py-6">
      <InsightsDashboard
        teamId={workspace.team_id}
        workspaceId={workspaceId}
        initialTab={initialTab}
      />
    </div>
  )
}

// Metadata
export async function generateMetadata({ params }: InsightsPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: workspace?.name
      ? `Insights - ${workspace.name}`
      : 'Customer Insights',
    description: 'Manage customer insights and feedback',
  }
}
