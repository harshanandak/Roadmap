'use client'

/**
 * Linked Insights Section
 *
 * Shows insights linked to a work item with:
 * - Relevance scores
 * - Quick view in sheet
 * - Add/remove links
 * - Vote counts
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Lightbulb,
  Plus,
  Link2,
  Unlink,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import type { CustomerInsightWithMeta, InsightSentiment, InsightSource } from '@/lib/types/customer-insight'

// API returns insights with link metadata merged
interface LinkedInsightFromAPI extends CustomerInsightWithMeta {
  link_id: string
  relevance_score?: number
  link_notes?: string
  linked_at?: string
}

interface LinkedInsightsSectionProps {
  workItemId: string
  teamId: string
  workspaceId: string
  onInsightClick?: (insight: CustomerInsightWithMeta) => void
  className?: string
}

const sentimentColors: Record<InsightSentiment, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mixed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const sourceIcons: Record<InsightSource, string> = {
  feedback: '💬',
  support: '🎧',
  interview: '👥',
  survey: '📋',
  social: '📱',
  analytics: '📊',
  other: '📄',
}

export function LinkedInsightsSection({
  workItemId,
  teamId,
  workspaceId,
  onInsightClick,
  className,
}: LinkedInsightsSectionProps) {
  const { toast } = useToast()

  const [linkedInsights, setLinkedInsights] = useState<LinkedInsightFromAPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add insight dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CustomerInsightWithMeta[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLinking, setIsLinking] = useState<string | null>(null)
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null)

  // Fetch linked insights
  const fetchLinkedInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/work-items/${workItemId}/insights`)

      if (!response.ok) {
        throw new Error('Failed to fetch linked insights')
      }

      const data = await response.json()
      setLinkedInsights(data.data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch linked insights'
      setError(message)
      console.error('Error fetching linked insights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workItemId])

  // Initial fetch
  useEffect(() => {
    fetchLinkedInsights()
  }, [fetchLinkedInsights])

  // Search for insights to link
  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      const params = new URLSearchParams({
        team_id: teamId,
        workspace_id: workspaceId,
        search: query,
        limit: '10',
      })

      const response = await fetch(`/api/insights?${params}`)

      if (response.ok) {
        const data = await response.json()
        // Filter out already linked insights
        const linkedIds = linkedInsights.map((li) => li.id)
        setSearchResults(
          (data.data || []).filter((i: CustomerInsightWithMeta) => !linkedIds.includes(i.id))
        )
      }
    } catch (err) {
      console.error('Error searching insights:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Link an insight
  const handleLink = async (insight: CustomerInsightWithMeta) => {
    setIsLinking(insight.id)

    try {
      const response = await fetch(`/api/insights/${insight.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_item_id: workItemId,
          relevance_score: 5, // Default relevance
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to link insight')
      }

      toast({
        title: 'Insight linked',
        description: 'The insight has been linked to this work item',
      })

      // Refresh linked insights
      fetchLinkedInsights()

      // Remove from search results
      setSearchResults((prev) => prev.filter((i) => i.id !== insight.id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to link insight'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsLinking(null)
    }
  }

  // Unlink an insight
  const handleUnlink = async (insight: LinkedInsightFromAPI) => {
    setIsUnlinking(insight.link_id)

    try {
      const response = await fetch(
        `/api/insights/${insight.id}/link?work_item_id=${workItemId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlink insight')
      }

      toast({
        title: 'Insight unlinked',
        description: 'The insight has been unlinked from this work item',
      })

      // Remove from list
      setLinkedInsights((prev) => prev.filter((li) => li.link_id !== insight.link_id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to unlink insight'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsUnlinking(null)
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Linked Insights
          </CardTitle>
          <CardDescription className="text-xs">
            Customer feedback connected to this work item
          </CardDescription>
        </div>

        {/* Add Insight Button */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Link an Insight</DialogTitle>
              <DialogDescription>
                Search for customer insights to link to this work item
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search insights..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {searchQuery.length < 2
                      ? 'Type to search for insights'
                      : 'No matching insights found'}
                  </p>
                ) : (
                  searchResults.map((insight) => (
                    <div
                      key={insight.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium truncate">{insight.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', sentimentColors[insight.sentiment])}
                          >
                            {insight.sentiment}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {sourceIcons[insight.source]} {insight.source}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLink(insight)}
                        disabled={isLinking === insight.id}
                      >
                        {isLinking === insight.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : linkedInsights.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No insights linked yet
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="mt-1"
            >
              Link your first insight
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedInsights.map((insight) => (
              <div
                key={insight.link_id}
                className="group flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onInsightClick?.(insight)}
                >
                  <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                    {insight.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', sentimentColors[insight.sentiment])}
                    >
                      {insight.sentiment}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {sourceIcons[insight.source]}
                    </span>
                    {/* Vote counts */}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      {insight.upvote_count || 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsDown className="h-3 w-3" />
                      {insight.downvote_count || 0}
                    </span>
                    {/* Relevance score */}
                    {insight.relevance_score && (
                      <Badge variant="outline" className="text-xs">
                        {insight.relevance_score}/10
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Unlink button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleUnlink(insight)}
                  disabled={isUnlinking === insight.link_id}
                  title="Unlink insight"
                >
                  {isUnlinking === insight.link_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
