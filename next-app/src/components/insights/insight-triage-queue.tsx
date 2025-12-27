'use client'

/**
 * Insight Triage Queue Component
 *
 * A focused view for quickly reviewing and triaging new insights.
 * Features:
 * - Filters to show only new/unreviewed insights
 * - Keyboard navigation (j/k or arrow keys)
 * - Quick status actions (R=Review, A=Actionable, D=Archive)
 * - Link to work item shortcut (L)
 * - Visual selection highlight
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Keyboard,
  RefreshCcw,
  Loader2,
  CheckCircle,
  Target,
  Archive,
  Sparkles,
  Link2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CustomerInsightWithMeta,
  InsightStatus,
} from '@/lib/types/customer-insight'
import { InsightCard } from './insight-card'
import { useInsightShortcuts, INSIGHT_KEYBOARD_SHORTCUTS } from './hooks/use-insight-shortcuts'

interface InsightTriageQueueProps {
  teamId: string
  workspaceId?: string
  onOpenDetail?: (insight: CustomerInsightWithMeta) => void
  onEdit?: (insight: CustomerInsightWithMeta) => void
  onLink?: (insight: CustomerInsightWithMeta) => void
  className?: string
}

export function InsightTriageQueue({
  teamId,
  workspaceId,
  onOpenDetail,
  onEdit: _onEdit,
  onLink,
  className,
}: InsightTriageQueueProps) {
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // State
  const [insights, setInsights] = useState<CustomerInsightWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Fetch only new/unreviewed insights for triage
  const fetchInsights = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams({
        team_id: teamId,
        limit: '50', // Show more for triage
        sort_by: 'created_at',
        sort_dir: 'desc',
        status: 'new', // Only new insights for triage
      })

      if (workspaceId) params.set('workspace_id', workspaceId)
      if (search) params.set('search', search)

      const response = await fetch(`/api/insights?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch insights')
      }

      const data = await response.json()
      setInsights(data.data || [])

      // Auto-select first insight if none selected
      if (data.data?.length > 0 && !selectedId) {
        setSelectedId(data.data[0].id)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load insights'
      setError(message)
      console.error('Error fetching triage insights:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [teamId, workspaceId, search, selectedId])

  // Initial fetch
  useEffect(() => {
    fetchInsights()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when search changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInsights()
    }, 300)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle status change
  const handleStatusChange = useCallback(async (insightId: string, newStatus: InsightStatus) => {
    setProcessingId(insightId)
    try {
      const response = await fetch(`/api/insights/${insightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update insight')
      }

      toast({
        title: 'Insight updated',
        description: `Status changed to ${newStatus}`,
      })

      // Remove from queue (since it's no longer "new")
      setInsights((prev) => prev.filter((i) => i.id !== insightId))

      // Select next insight
      const currentIndex = insights.findIndex((i) => i.id === insightId)
      if (currentIndex !== -1 && insights.length > 1) {
        const nextIndex = currentIndex < insights.length - 1 ? currentIndex + 1 : currentIndex - 1
        setSelectedId(insights[nextIndex]?.id || null)
      } else {
        setSelectedId(null)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update insight'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }, [insights, toast])

  // Handle link action
  const handleLink = useCallback((insightId: string) => {
    const insight = insights.find((i) => i.id === insightId)
    if (insight && onLink) {
      onLink(insight)
    }
  }, [insights, onLink])

  // Handle open detail
  const handleOpenDetail = useCallback((insightId: string) => {
    const insight = insights.find((i) => i.id === insightId)
    if (insight && onOpenDetail) {
      onOpenDetail(insight)
    }
  }, [insights, onOpenDetail])

  // Extract insight IDs for keyboard navigation
  const insightIds = insights.map((i) => i.id)

  // Keyboard shortcuts
  useInsightShortcuts({
    selectedId,
    insightIds,
    onSelect: setSelectedId,
    onStatusChange: handleStatusChange,
    onOpenDetail: handleOpenDetail,
    onLink: handleLink,
    onShowHelp: () => setShowHelpDialog(true),
    searchInputRef,
    enabled: !showHelpDialog, // Disable when help dialog is open
  })

  // Get selected insight
  const selectedInsight = insights.find((i) => i.id === selectedId)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header: Search + Help + Refresh */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search triage queue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Actions Info */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <Keyboard className="h-3 w-3" />
            Press ? for shortcuts
          </Badge>
        </div>

        {/* Keyboard Help */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowHelpDialog(true)}
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>

        {/* Refresh */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchInsights(true)}
          disabled={isRefreshing}
          title="Refresh queue"
        >
          <RefreshCcw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Quick Actions Bar */}
      {selectedInsight && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium mr-2">Quick Actions:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange(selectedInsight.id, 'reviewed')}
            disabled={processingId === selectedInsight.id}
            className="gap-1"
          >
            <CheckCircle className="h-4 w-4 text-purple-600" />
            <span className="hidden sm:inline">Review</span>
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-xs bg-background rounded border">R</kbd>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange(selectedInsight.id, 'actionable')}
            disabled={processingId === selectedInsight.id}
            className="gap-1"
          >
            <Target className="h-4 w-4 text-orange-600" />
            <span className="hidden sm:inline">Actionable</span>
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-xs bg-background rounded border">A</kbd>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStatusChange(selectedInsight.id, 'archived')}
            disabled={processingId === selectedInsight.id}
            className="gap-1"
          >
            <Archive className="h-4 w-4 text-gray-500" />
            <span className="hidden sm:inline">Archive</span>
            <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-xs bg-background rounded border">D</kbd>
          </Button>
          {onLink && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleLink(selectedInsight.id)}
              className="gap-1"
            >
              <Link2 className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">Link</span>
              <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 text-xs bg-background rounded border">L</kbd>
            </Button>
          )}
          {processingId === selectedInsight.id && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      )}

      {/* Triage Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{insights.length}</span>
          <span className="text-muted-foreground">insights to triage</span>
        </div>
        {selectedId && (
          <div className="text-muted-foreground">
            Selected: {insightIds.indexOf(selectedId) + 1} of {insights.length}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchInsights()}>
            Try Again
          </Button>
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Triage queue is empty!</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            All insights have been reviewed. Great job staying on top of customer feedback!
          </p>
          <Button variant="outline" onClick={() => fetchInsights(true)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                'rounded-lg transition-all cursor-pointer',
                selectedId === insight.id && 'ring-2 ring-primary ring-offset-2',
                processingId === insight.id && 'opacity-50'
              )}
              onClick={() => setSelectedId(insight.id)}
              onDoubleClick={() => handleOpenDetail(insight.id)}
            >
              <InsightCard
                insight={insight}
                showVoting={false}
                isCompact={true}
                showActions={false}
                onView={() => handleOpenDetail(insight.id)}
                className={cn(
                  selectedId === insight.id && 'bg-primary/5'
                )}
              />
            </div>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to quickly triage insights
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Group shortcuts by scope */}
            {['Navigation', 'Status', 'Action', 'Global'].map((scope) => {
              const scopeShortcuts = INSIGHT_KEYBOARD_SHORTCUTS.filter((s) => s.scope === scope)
              if (scopeShortcuts.length === 0) return null
              return (
                <div key={scope}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{scope}</h4>
                  <div className="space-y-2">
                    {scopeShortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
