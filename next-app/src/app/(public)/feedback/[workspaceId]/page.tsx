'use client'

/**
 * Public Feedback Page
 *
 * Allows anonymous feedback submission for a workspace.
 * Validates that the workspace exists and has public feedback enabled.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PublicFeedbackForm } from '@/components/feedback/public-feedback-form'
import { FeedbackThankYou } from '@/components/feedback/feedback-thank-you'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface WorkspaceInfo {
  id: string
  name: string
  icon?: string
  public_feedback_enabled: boolean
}

export default function PublicFeedbackPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { toast } = useToast()

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // Fetch workspace info
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const response = await fetch(`/api/public/workspaces/${workspaceId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Workspace not found')
        }

        if (!data.data.public_feedback_enabled) {
          throw new Error('Public feedback is not enabled for this workspace')
        }

        setWorkspace(data.data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace')
      } finally {
        setIsLoading(false)
      }
    }

    if (workspaceId) {
      fetchWorkspace()
    }
  }, [workspaceId])

  const handleSuccess = () => {
    setSubmitted(true)
  }

  const handleError = (errorMessage: string) => {
    toast({
      title: 'Submission Failed',
      description: errorMessage,
      variant: 'destructive',
    })
  }

  const handleSubmitAnother = () => {
    setSubmitted(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <Skeleton className="h-8 w-8 mx-auto rounded-full" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error || !workspace) {
    return (
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle>Feedback Unavailable</CardTitle>
          <CardDescription className="text-base">
            {error || 'This feedback page is not available.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The workspace may have disabled public feedback, or the link may be incorrect.
            Please contact the workspace owner for assistance.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Success state
  if (submitted) {
    return (
      <FeedbackThankYou
        workspace={workspace}
        onSubmitAnother={handleSubmitAnother}
        showSubmitAnother={true}
      />
    )
  }

  // Form state
  return (
    <PublicFeedbackForm
      workspace={workspace}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  )
}
