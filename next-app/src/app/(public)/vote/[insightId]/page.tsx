'use client'

/**
 * Public Voting Page
 *
 * Allows external users to vote on shared insights.
 * Validates that the insight is public-shareable and
 * adapts voting flow based on workspace settings.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PublicVoteCard } from '@/components/insights/public-vote-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Vote } from 'lucide-react'

interface PublicInsight {
  id: string
  title: string
  quote_preview?: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed'
  tags: string[]
  upvote_count: number
  downvote_count: number
}

interface WorkspaceInfo {
  id: string
  name: string
  voting_settings: {
    enabled: boolean
    requireEmailVerification: boolean
    allowAnonymous: boolean
  }
}

export default function PublicVotePage() {
  const params = useParams()
  const insightId = params.insightId as string

  const [insight, setInsight] = useState<PublicInsight | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch insight and workspace info
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/public/insights/${insightId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Insight not found')
        }

        setInsight(data.insight)
        setWorkspace(data.workspace)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load insight')
      } finally {
        setIsLoading(false)
      }
    }

    if (insightId) {
      fetchData()
    }
  }, [insightId])

  // Handle successful vote
  const handleVoteSuccess = (voteType: 'up' | 'down') => {
    if (insight) {
      setInsight({
        ...insight,
        upvote_count: voteType === 'up' ? insight.upvote_count + 1 : insight.upvote_count,
        downvote_count: voteType === 'down' ? insight.downvote_count + 1 : insight.downvote_count,
      })
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Skeleton className="h-4 w-24 mx-auto mb-2" />
          <Skeleton className="h-6 w-48 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error || !insight || !workspace) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle>Voting Unavailable</CardTitle>
          <CardDescription className="text-base">
            {error || 'This insight is not available for public voting.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The insight may have been removed or public sharing may be disabled.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Voting disabled
  if (!workspace.voting_settings.enabled) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Vote className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle>Voting Disabled</CardTitle>
          <CardDescription className="text-base">
            Public voting is currently disabled for this workspace.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Voting card
  return (
    <PublicVoteCard
      insight={insight}
      workspaceName={workspace.name}
      votingSettings={workspace.voting_settings}
      onVoteSuccess={handleVoteSuccess}
    />
  )
}
