'use client';

import { DashboardView } from './dashboard-view';
import { WorkItemsView } from './work-items-view';
import { TimelineView } from './timeline-view';
import { CanvasView } from './canvas-view';
import { SettingsView } from './settings-view';
import { TeamAnalyticsView } from './team-analytics-view';
import { ProductTasksView } from './product-tasks-view';
import { PermissionsProvider } from '@/providers/permissions-provider';
import type { Department } from '@/lib/types/department';
import type { WorkItem, TimelineItem, LinkedItem } from '@/lib/types/work-items';
import type { MindMap } from '@/lib/types/mind-map';
import type { Team } from '@/lib/types/team';
import type { Database } from '@/lib/supabase/types';
import { useEffect } from 'react';

/** Workspace row from the database */
type Workspace = Database['public']['Tables']['workspaces']['Row'];

/** Tag type for workspace content */
interface Tag {
  id: string;
  name: string;
  color?: string;
}

/** Phase distribution for dashboard display */
interface PhaseDistribution {
  research: number;
  planning: number;
  execution: number;
  review: number;
  complete: number;
}

/** Onboarding state structure */
interface OnboardingState {
  isComplete: boolean;
  completedSteps?: string[];
  currentStep?: string;
}

interface WorkspaceContentProps {
  view: string;
  workspace: Workspace;
  team: Team;
  workItems: WorkItem[];
  timelineItems: TimelineItem[];
  linkedItems: LinkedItem[];
  mindMaps: MindMap[];
  tags: Tag[];
  departments: Department[];
  teamSize: number;
  phaseDistribution: PhaseDistribution;
  onboardingState: OnboardingState;
  currentUserId: string;
  userEmail?: string;
  userName?: string;
}

export function WorkspaceContent({
  view,
  workspace,
  team,
  workItems,
  timelineItems,
  linkedItems,
  mindMaps,
  tags,
  departments,
  teamSize,
  phaseDistribution,
  onboardingState,
  currentUserId,
  userEmail,
  userName,
}: WorkspaceContentProps) {
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ebdf2fd5-9696-479e-b2f1-d72537069b93', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix2',
        hypothesisId: 'H7',
        location: 'workspace-content.tsx:mount',
        message: 'WorkspaceContent mounted',
        data: {
          view,
          workspaceId: workspace?.id,
          teamId: workspace?.team_id,
          workItems: workItems?.length ?? null,
          timelineItems: timelineItems?.length ?? null,
          linkedItems: linkedItems?.length ?? null,
          mindMaps: mindMaps?.length ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [view, workspace, workItems, timelineItems, linkedItems, mindMaps])

  // Render content based on view parameter
  const renderView = () => {
    switch (view) {
      case 'dashboard':
      case 'overview':
        return (
          <DashboardView
            workspace={workspace}
            team={team}
            workItems={workItems}
            teamSize={teamSize}
            phaseDistribution={phaseDistribution}
            onboardingState={onboardingState}
          />
        );

      case 'work-items':
        return (
          <WorkItemsView
            workspace={workspace}
            team={team}
            workItems={workItems}
            timelineItems={timelineItems}
            linkedItems={linkedItems}
            tags={tags}
            currentUserId={currentUserId}
            userEmail={userEmail}
            userName={userName}
          />
        );

      case 'timeline':
        return (
          <TimelineView
            workspace={workspace}
            workItems={workItems}
            timelineItems={timelineItems}
            linkedItems={linkedItems}
            departments={departments}
            currentUserId={currentUserId}
          />
        );

      case 'canvas':
      case 'mind-map':
      case 'dependencies':
        return (
          <CanvasView
            workspace={workspace}
            workItems={workItems}
            linkedItems={linkedItems}
          />
        );

      case 'settings':
        return (
          <SettingsView
            workspace={workspace}
            team={team}
            currentUserId={currentUserId}
          />
        );

      case 'team-analytics':
        return (
          <TeamAnalyticsView
            workspace={workspace}
          />
        );

      case 'product-tasks':
        return (
          <ProductTasksView
            workspace={workspace}
          />
        );

      default:
        return (
          <DashboardView
            workspace={workspace}
            team={team}
            workItems={workItems}
            teamSize={teamSize}
            phaseDistribution={phaseDistribution}
            onboardingState={onboardingState}
          />
        );
    }
  };

  return (
    <PermissionsProvider
      workspaceId={workspace.id}
      teamId={workspace.team_id}
    >
      <div className="flex-1 overflow-auto">
        {/* View-specific content */}
        <main className="px-8 py-6">
          {renderView()}
        </main>
      </div>
    </PermissionsProvider>
  );
}
