'use client'

/**
 * Canvas View Component
 *
 * Unified visual canvas that replaces Mind Map and Dependencies views
 * Single source of truth for all visual work item relationships
 */

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Import canvas wrapper as client-side only to avoid ReactFlow hydration warnings
const CanvasViewWrapper = dynamic(
  () => import('@/components/canvas/canvas-view-wrapper').then((mod) => ({ default: mod.CanvasViewWrapper })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-12rem)] w-full rounded-lg border bg-white shadow-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading canvas...</p>
        </div>
      </div>
    ),
  }
)

interface WorkspaceData {
  id: string
  team_id: string
}

interface WorkItemData {
  id: string
  name?: string
  type?: string
  [key: string]: unknown
}

interface LinkedItemData {
  id: string
  source_id: string
  target_id: string
  [key: string]: unknown
}

interface CanvasViewProps {
  workspace: WorkspaceData
  workItems: WorkItemData[]
  linkedItems: LinkedItemData[]
}

export function CanvasView({ workspace, workItems, linkedItems }: CanvasViewProps) {
  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-lg border bg-white shadow-sm">
      <CanvasViewWrapper
        workspaceId={workspace.id}
        teamId={workspace.team_id}
        initialWorkItems={workItems}
        initialLinkedItems={linkedItems}
      />
    </div>
  )
}
