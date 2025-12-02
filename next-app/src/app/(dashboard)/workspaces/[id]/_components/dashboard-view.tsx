'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkspaceStatsGrid } from '@/components/workspaces/workspace-stats-grid';
import { MultiPhaseProgressBar } from '@/components/workspaces/multi-phase-progress-bar';
import { ActivityFeed } from '@/components/workspaces/activity-feed';
import { ContextualOnboarding } from './contextual-onboarding';
import { ModeAwareDashboard } from '@/components/dashboard/mode-aware-dashboard';
import { type WorkspaceMode } from '@/lib/types/workspace-mode';

interface DashboardViewProps {
  workspace: any;
  team: any;
  workItems: any[];
  teamSize: number;
  phaseDistribution: any;
  onboardingState: any;
  /** Enable mode-aware dashboard widgets */
  useModeAwareDashboard?: boolean;
}

export function DashboardView({
  workspace,
  team,
  workItems,
  teamSize,
  phaseDistribution,
  onboardingState,
  useModeAwareDashboard = true,
}: DashboardViewProps) {
  // Calculate stats
  const totalWorkItems = workItems?.length || 0;
  const completedWorkItems = workItems?.filter((item) => item.status === 'completed').length || 0;
  const inProgressWorkItems = workItems?.filter((item) => item.status === 'in_progress').length || 0;
  const completionPercentage = totalWorkItems > 0
    ? Math.round((completedWorkItems / totalWorkItems) * 100)
    : 0;

  // Get workspace mode (defaults to 'development')
  const workspaceMode = (workspace.mode || 'development') as WorkspaceMode;

  // Use mode-aware dashboard when enabled and workspace has a mode
  if (useModeAwareDashboard && workspace.mode) {
    return (
      <div className="space-y-6">
        {/* Mode-Aware Dashboard */}
        <ModeAwareDashboard
          mode={workspaceMode}
          workspaceId={workspace.id}
          workItems={workItems || []}
          teamSize={teamSize}
          phaseDistribution={phaseDistribution}
        />

        {/* Description */}
        {workspace.description && (
          <Card>
            <CardHeader>
              <CardTitle>About this Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{workspace.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Contextual Onboarding (if applicable) */}
        {onboardingState && !onboardingState.isComplete && (
          <ContextualOnboarding
            workspaceId={workspace.id}
            onboardingState={onboardingState}
          />
        )}
      </div>
    );
  }

  // Classic dashboard layout (fallback)
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <WorkspaceStatsGrid
        totalWorkItems={totalWorkItems}
        completedWorkItems={completedWorkItems}
        inProgressWorkItems={inProgressWorkItems}
        completionPercentage={completionPercentage}
        teamSize={teamSize}
      />

      {/* Multi-Phase Progress Bar */}
      <MultiPhaseProgressBar
        distribution={phaseDistribution}
        totalItems={totalWorkItems}
      />

      {/* Description */}
      {workspace.description && (
        <Card>
          <CardHeader>
            <CardTitle>About this Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{workspace.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout: Contextual Onboarding + Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Contextual Onboarding (2/3 width) */}
        <div className="lg:col-span-2">
          <ContextualOnboarding
            workspaceId={workspace.id}
            onboardingState={onboardingState}
          />
        </div>

        {/* Right Column: Activity Feed (1/3 width) */}
        <div className="lg:col-span-1">
          <ActivityFeed workItems={workItems || []} />
        </div>
      </div>
    </div>
  );
}
