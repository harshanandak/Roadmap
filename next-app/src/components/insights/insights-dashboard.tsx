'use client'

/**
 * Insights Dashboard Component
 *
 * Full-featured dashboard for managing customer insights:
 * - Stats overview with clickable filters
 * - Filterable, sortable list
 * - Detail sheet for viewing/editing
 * - Tabbed views: All | Triage Queue | By Source
 *
 * Uses existing InsightList and composes with new components.
 */

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Lightbulb,
  Inbox,
  FolderOpen,
  Link2,
  Plus,
  RefreshCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InsightList } from './insight-list'
import { InsightsDashboardStats, type InsightStats } from './insights-dashboard-stats'
import { InsightDetailSheet } from './insight-detail-sheet'
import { InsightFormDialog } from './insight-form'
import { InsightLinkDialog } from './insight-link-dialog'
import { InsightTriageQueue } from './insight-triage-queue'
import type {
  CustomerInsightWithMeta,
  InsightStatus,
  VoteType,
} from '@/lib/types/customer-insight'

interface InsightsDashboardProps {
  teamId: string
  workspaceId: string
  initialTab?: 'all' | 'triage' | 'linked'
  className?: string
}

export function InsightsDashboard({
  teamId,
  workspaceId,
  initialTab = 'all',
  className,
}: InsightsDashboardProps) {
  const { toast } = useToast()

  // State
  const [activeTab, setActiveTab] = useState(initialTab)
  const [stats, setStats] = useState<InsightStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [statsFilter, setStatsFilter] = useState<{
    type: 'sentiment' | 'status'
    value: string
  } | undefined>(undefined)

  // Detail sheet state
  const [selectedInsight, setSelectedInsight] = useState<CustomerInsightWithMeta | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [userVote, setUserVote] = useState<VoteType | null>(null)
  const [linkedWorkItems, setLinkedWorkItems] = useState<Array<{ id: string; name: string; type: string; status: string }>>([])
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(false)

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingInsight, setEditingInsight] = useState<CustomerInsightWithMeta | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkingInsight, setLinkingInsight] = useState<CustomerInsightWithMeta | null>(null)

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const params = new URLSearchParams({
        team_id: teamId,
        workspace_id: workspaceId,
      })

      const response = await fetch(`/api/insights/stats?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats on error
      setStats({
        total: 0,
        bySentiment: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
        byStatus: { new: 0, reviewed: 0, actionable: 0, addressed: 0, archived: 0 },
      })
    } finally {
      setIsLoadingStats(false)
    }
  }, [teamId, workspaceId])

  // Initial fetch
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Fetch linked work items when insight is selected
  const fetchLinkedWorkItems = useCallback(async (insightId: string) => {
    setIsLoadingWorkItems(true)
    try {
      const response = await fetch(`/api/insights/${insightId}?include_links=true`)
      if (response.ok) {
        const data = await response.json()
        const workItems = (data.data?.linked_work_items || []).map((item: { id: string; name: string; type?: string; status?: string }) => ({
          id: item.id,
          name: item.name,
          type: item.type || 'feature',
          status: item.status || 'design',
        }))
        setLinkedWorkItems(workItems)
      }
    } catch (error) {
      console.error('Error fetching linked work items:', error)
    } finally {
      setIsLoadingWorkItems(false)
    }
  }, [])

  // Handle insight selection (open detail sheet)
  const handleViewInsight = (insight: CustomerInsightWithMeta) => {
    setSelectedInsight(insight)
    setUserVote(null) // Will be fetched if needed
    setSheetOpen(true)
    fetchLinkedWorkItems(insight.id)
  }

  // Handle create new
  const handleCreateNew = () => {
    setEditingInsight(null)
    setFormDialogOpen(true)
  }

  // Handle edit
  const handleEdit = (insight: CustomerInsightWithMeta) => {
    setEditingInsight(insight)
    setFormDialogOpen(true)
    setSheetOpen(false)
  }

  // Handle delete
  const handleDelete = async (insight: CustomerInsightWithMeta) => {
    if (!confirm(`Are you sure you want to delete "${insight.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/insights/${insight.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete')
      }

      toast({
        title: 'Insight deleted',
        description: 'The insight has been removed',
      })

      setSheetOpen(false)
      setRefreshKey((k) => k + 1)
      fetchStats()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete insight'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Handle link
  const handleLink = (insight: CustomerInsightWithMeta) => {
    setLinkingInsight(insight)
    setLinkDialogOpen(true)
  }

  // Handle vote
  const handleVote = async (voteType: VoteType) => {
    if (!selectedInsight) return

    try {
      const response = await fetch(`/api/insights/${selectedInsight.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: voteType }),
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }

      const data = await response.json()
      setUserVote(data.data.vote_type)

      // Refresh to update counts
      setRefreshKey((k) => k + 1)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to record vote'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Handle status change
  const handleStatusChange = async (insight: CustomerInsightWithMeta, status: InsightStatus) => {
    const response = await fetch(`/api/insights/${insight.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update status')
    }

    // Update selected insight
    setSelectedInsight((prev) => prev ? { ...prev, status } : null)

    // Refresh list and stats
    setRefreshKey((k) => k + 1)
    fetchStats()
  }

  // Handle unlink work item
  const handleUnlinkWorkItem = async (workItemId: string) => {
    if (!selectedInsight) return

    const response = await fetch(
      `/api/insights/${selectedInsight.id}/link?work_item_id=${workItemId}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      throw new Error('Failed to unlink')
    }

    // Refresh linked items
    fetchLinkedWorkItems(selectedInsight.id)
  }

  // Handle form success
  const handleFormSuccess = (insight: CustomerInsightWithMeta) => {
    setFormDialogOpen(false)
    setRefreshKey((k) => k + 1)
    fetchStats()

    toast({
      title: editingInsight ? 'Insight updated' : 'Insight created',
      description: `"${insight.title}" has been ${editingInsight ? 'updated' : 'created'}`,
    })
  }

  // Handle link success
  const handleLinkSuccess = () => {
    setLinkDialogOpen(false)
    setRefreshKey((k) => k + 1)

    if (selectedInsight) {
      fetchLinkedWorkItems(selectedInsight.id)
    }

    toast({
      title: 'Insight linked',
      description: 'Work item has been linked to the insight',
    })
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            Customer Insights
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Voice-of-customer feedback and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchStats()
              setRefreshKey((k) => k + 1)
            }}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Insight
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <InsightsDashboardStats
        stats={stats || {
          total: 0,
          bySentiment: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
          byStatus: { new: 0, reviewed: 0, actionable: 0, addressed: 0, archived: 0 },
        }}
        activeFilter={statsFilter}
        onFilterChange={(filter) => setStatsFilter(filter ?? undefined)}
        isLoading={isLoadingStats}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'triage' | 'linked')}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <FolderOpen className="h-4 w-4" />
            All Insights
          </TabsTrigger>
          <TabsTrigger value="triage" className="gap-1.5">
            <Inbox className="h-4 w-4" />
            Triage Queue
            {stats && stats.byStatus.new > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {stats.byStatus.new}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="linked" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            Linked
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <InsightList
            key={`all-${refreshKey}`}
            teamId={teamId}
            workspaceId={workspaceId}
            showCreateButton={false}
            onView={handleViewInsight}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLink={handleLink}
            // Apply stats filter if set
            {...(statsFilter?.type === 'sentiment' && { sentimentFilter: statsFilter.value })}
            {...(statsFilter?.type === 'status' && { statusFilter: statsFilter.value })}
          />
        </TabsContent>

        <TabsContent value="triage" className="mt-4">
          <InsightTriageQueue
            key={`triage-${refreshKey}`}
            teamId={teamId}
            workspaceId={workspaceId}
            onOpenDetail={handleViewInsight}
            onEdit={handleEdit}
            onLink={handleLink}
          />
        </TabsContent>

        <TabsContent value="linked" className="mt-4">
          <InsightList
            key={`linked-${refreshKey}`}
            teamId={teamId}
            workspaceId={workspaceId}
            showCreateButton={false}
            onView={handleViewInsight}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLink={handleLink}
            // Filter to insights with work items linked
            hasWorkItems={true}
          />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <InsightDetailSheet
        insight={selectedInsight}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLink={handleLink}
        onStatusChange={handleStatusChange}
        userVote={userVote}
        onVote={handleVote}
        linkedWorkItems={linkedWorkItems}
        onUnlinkWorkItem={handleUnlinkWorkItem}
        isLoadingWorkItems={isLoadingWorkItems}
      />

      {/* Create/Edit Form Dialog */}
      <InsightFormDialog
        teamId={teamId}
        workspaceId={workspaceId}
        insight={editingInsight || undefined}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={handleFormSuccess}
      />

      {/* Link Dialog */}
      {linkingInsight && (
        <InsightLinkDialog
          insight={linkingInsight}
          teamId={teamId}
          workspaceId={workspaceId}
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          onSuccess={handleLinkSuccess}
        />
      )}
    </div>
  )
}
