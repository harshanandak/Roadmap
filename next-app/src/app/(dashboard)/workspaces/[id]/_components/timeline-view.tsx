'use client';

/**
 * TimelineView Wrapper Component
 *
 * Transforms workspace data into the format required by the
 * core TimelineView component from @/components/timeline.
 * Handles data transformation and dependency mapping.
 *
 * @module workspaces/timeline-view
 */

import { useMemo } from 'react';
import { TimelineView as CoreTimelineView, TimelineWorkItem } from '@/components/timeline/timeline-view';
import type { Department } from '@/lib/types/department';

interface WorkspaceData {
  id: string;
  name: string;
  team_id: string;
}

interface WorkItemData {
  id: string;
  name?: string;
  title?: string;
  timeline_phase?: string;
  status?: string;
  priority?: string;
  start_date?: string;
  planned_start_date?: string;
  end_date?: string;
  planned_end_date?: string;
  duration_days?: number;
  assignee?: string;
  team?: string;
  department_id?: string;
  department?: string;
}

interface LinkedItemData {
  source_id: string;
  target_id: string;
  link_type?: string;
}

interface TimelineViewProps {
  workspace: WorkspaceData;
  workItems: WorkItemData[];
  timelineItems: unknown[];
  linkedItems: LinkedItemData[];
  departments: Department[];
  currentUserId: string;
}

export function TimelineView({
  workspace,
  workItems,
  timelineItems: _timelineItems,
  linkedItems,
  departments,
  currentUserId,
}: TimelineViewProps) {
  // Transform work items to TimelineWorkItem format
  const transformedWorkItems = useMemo<TimelineWorkItem[]>(() => {
    return workItems.map((item) => {
      // Find dependencies for this item
      const itemDependencies = linkedItems
        .filter((link) => link.source_id === item.id)
        .map((link) => ({
          targetId: link.target_id,
          type: link.link_type || 'relates_to',
        }));

      return {
        id: item.id,
        name: item.name || item.title || 'Untitled',
        timeline_phase: (item.timeline_phase || 'MVP') as 'MVP' | 'SHORT' | 'LONG',
        status: item.status || 'planned',
        priority: item.priority,
        planned_start_date: item.start_date || item.planned_start_date,
        planned_end_date: item.end_date || item.planned_end_date,
        duration_days: item.duration_days,
        dependencies: itemDependencies,
        assignee: item.assignee,
        team: item.team,
        department_id: item.department_id,
        // Convert string department to object if needed
        department: typeof item.department === 'string'
          ? { id: item.department_id || item.department, name: item.department, color: '#gray', icon: '' }
          : item.department,
      };
    });
  }, [workItems, linkedItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Timeline</h2>
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
        currentUserId={currentUserId}
        departments={departments}
      />
    </div>
  );
}
