import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { TimelineView as CoreTimelineView, TimelineWorkItem } from '@/components/timeline/timeline-view';
import type { Department } from '@/lib/types/department';

/**
 * Standalone Timeline Page
 *
 * Dedicated page for timeline visualization at /workspaces/[id]/timeline
 * This provides a full-page timeline experience without the workspace switcher overhead.
 *
 * @route /workspaces/[id]/timeline
 */
export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get workspace
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !workspace) {
    notFound();
  }

  // Check if user has access to this workspace's team
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', workspace.team_id)
    .eq('user_id', user.id)
    .single();

  if (!teamMember) {
    redirect('/dashboard');
  }

  // Fetch data in parallel
  const [
    { data: workItems },
    { data: linkedItems },
    { data: departments },
  ] = await Promise.all([
    // Work items with department join
    supabase
      .from('work_items')
      .select('*, department:departments(id, name, color, icon)')
      .eq('workspace_id', id)
      .eq('team_id', workspace.team_id)
      .order('updated_at', { ascending: false }),

    // Linked items (dependencies)
    supabase.from('linked_items').select('*'),

    // Departments
    supabase
      .from('departments')
      .select('*')
      .eq('team_id', workspace.team_id)
      .order('sort_order'),
  ]);

  // Transform work items to TimelineWorkItem format
  const transformedWorkItems: TimelineWorkItem[] = (workItems || []).map((item) => {
    // Find dependencies for this item
    const itemDependencies = (linkedItems || [])
      .filter((link) => link.source_id === item.id)
      .map((link) => ({
        targetId: link.target_id,
        type: link.link_type || 'relates_to',
      }));

    return {
      id: item.id,
      name: item.name || item.title || 'Untitled',
      timeline_phase: item.timeline_phase || 'MVP',
      status: item.status || 'planned',
      priority: item.priority,
      planned_start_date: item.start_date || item.planned_start_date,
      planned_end_date: item.end_date || item.planned_end_date,
      duration_days: item.duration_days,
      dependencies: itemDependencies,
      assignee: item.assignee,
      team: item.team,
      department_id: item.department_id,
      department: item.department,
    };
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timeline</h1>
          <p className="text-muted-foreground">
            Gantt chart and timeline visualization for {workspace.name}
          </p>
        </div>
      </div>

      {/* Core Timeline Component */}
      <CoreTimelineView
        workItems={transformedWorkItems}
        workspaceId={workspace.id}
        teamId={workspace.team_id}
        currentUserId={user.id}
        departments={(departments as Department[]) || []}
      />
    </div>
  );
}
