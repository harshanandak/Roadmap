'use client'

import { PhaseLeadDashboard } from '@/components/team/phase-lead-dashboard'

interface TeamAnalyticsViewProps {
  workspace: {
    id: string
    name: string
    team_id: string
  }
}

export function TeamAnalyticsView({ workspace }: TeamAnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Project Team</h2>
        <p className="text-muted-foreground">
          Manage team members assigned to this workspace and their phase-specific roles. View phase leads, coverage analytics, and assign members to different project phases.
        </p>
      </div>

      <PhaseLeadDashboard workspaceId={workspace.id} />
    </div>
  )
}
