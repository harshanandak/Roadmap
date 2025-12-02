'use client'

/**
 * Workspace Onboarding Page
 *
 * Full-screen mode onboarding wizard shown after workspace creation.
 * Helps users understand their selected mode and optionally apply templates.
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ModeOnboardingWizard } from '@/components/onboarding/mode-onboarding-wizard'
import type { WorkspaceMode } from '@/lib/types/workspace-mode'

interface WorkspaceData {
  id: string
  name: string
  mode: WorkspaceMode
  team_id: string
}

export default function WorkspaceOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const { data, error: fetchError } = await supabase
          .from('workspaces')
          .select('id, name, mode, team_id')
          .eq('id', workspaceId)
          .single()

        if (fetchError) throw fetchError
        if (!data) throw new Error('Workspace not found')

        setWorkspace(data as WorkspaceData)
      } catch (err) {
        console.error('Error loading workspace:', err)
        setError(err instanceof Error ? err.message : 'Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [workspaceId, supabase])

  const handleApplyTemplate = async (templateId: string) => {
    const response = await fetch('/api/templates/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId,
        workspaceId,
        createDepartments: true,
        createWorkItems: true,
        addTags: true,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to apply template')
    }
  }

  const handleComplete = () => {
    // Mark onboarding as complete (could store in localStorage or DB)
    localStorage.setItem(`workspace_onboarding_${workspaceId}`, 'complete')
    router.push(`/workspaces/${workspaceId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || 'Workspace not found'}</p>
        <button
          onClick={() => router.push('/workspaces')}
          className="text-primary underline"
        >
          Back to Workspaces
        </button>
      </div>
    )
  }

  return (
    <ModeOnboardingWizard
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      mode={workspace.mode || 'development'}
      teamId={workspace.team_id}
      onComplete={handleComplete}
      onApplyTemplate={handleApplyTemplate}
    />
  )
}
