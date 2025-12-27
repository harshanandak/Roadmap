'use client'

/**
 * Strategies Page
 *
 * Displays the hierarchical OKR/Pillar strategy system for a workspace.
 * Enhanced with:
 * - React Query hooks for data management
 * - Three main tabs: Hierarchy, Dashboard, AI Suggestions
 * - Strategy Detail Sheet for viewing/editing
 * - Alignment Dashboard with 4 visualizations
 * - AI-powered alignment suggestions (Pro feature)
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Target,
  TreePine,
  List,
  RefreshCw,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { StrategyTree } from '@/components/strategy/strategy-tree'
import { StrategyForm } from '@/components/strategy/strategy-form'
import { StrategyCard } from '@/components/strategy/strategy-card'
import { StrategyDetailSheet } from '@/components/strategy/strategy-detail-sheet'
import { AlignmentDashboard } from '@/components/strategy/alignment-dashboard'
import { AIAlignmentSuggestions } from '@/components/strategy/ai-alignment-suggestions'
import {
  useStrategyTree,
  useStrategyStats,
  useStrategy,
  useCreateStrategy,
  useUpdateStrategy,
  useDeleteStrategy,
  useReorderStrategy,
} from '@/lib/hooks/use-strategies'
import type {
  StrategyWithChildren,
  CreateStrategyRequest,
  UpdateStrategyRequest,
  StrategyType,
} from '@/lib/types/strategy'

type MainTab = 'hierarchy' | 'dashboard' | 'ai-suggestions'
type ViewMode = 'tree' | 'list'

export default function StrategiesPage() {
  const params = useParams()
  const workspaceId = params.id as string
  const { toast } = useToast()

  // State
  const [teamId, setTeamId] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>('hierarchy')
  const [viewMode, setViewMode] = useState<ViewMode>('tree')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyWithChildren | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [strategyToDelete, setStrategyToDelete] = useState<StrategyWithChildren | null>(null)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<StrategyType>('pillar')

  // Fetch team ID from workspace
  useEffect(() => {
    async function fetchTeamId() {
      const supabase = createClient()
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('team_id')
        .eq('id', workspaceId)
        .single()

      if (workspace?.team_id) {
        setTeamId(workspace.team_id)
      }
    }
    fetchTeamId()
  }, [workspaceId])

  // React Query hooks
  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeError,
    refetch: refetchTree,
  } = useStrategyTree({
    teamId: teamId || '',
    workspaceId,
  })

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useStrategyStats({
    teamId: teamId || '',
    workspaceId,
  })

  // Fetch single strategy details for the sheet
  const {
    data: strategyDetail,
    isLoading: detailLoading,
  } = useStrategy(selectedStrategy?.id || '')

  // Mutations
  const createMutation = useCreateStrategy()
  const updateMutation = useUpdateStrategy()
  const deleteMutation = useDeleteStrategy()
  const reorderMutation = useReorderStrategy()

  const strategies = treeData?.data || []

  // Create strategy handler
  const handleCreate = async (data: CreateStrategyRequest | UpdateStrategyRequest) => {
    try {
      await createMutation.mutateAsync({
        ...data as CreateStrategyRequest,
        team_id: teamId!,
        workspace_id: workspaceId,
      })
      setCreateDialogOpen(false)
      setSelectedParentId(null)
      toast({
        title: 'Strategy created',
        description: 'Your strategy has been created successfully.',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create strategy'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Update strategy handler
  const handleUpdate = async (id: string, data: UpdateStrategyRequest) => {
    try {
      await updateMutation.mutateAsync({
        id,
        teamId: teamId!,
        workspaceId,
        ...data,
      })
      setEditDialogOpen(false)
      setSelectedStrategy(null)
      toast({
        title: 'Strategy updated',
        description: 'Your changes have been saved.',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update strategy'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Delete strategy handler
  const handleDelete = async () => {
    if (!strategyToDelete) return

    try {
      await deleteMutation.mutateAsync({
        id: strategyToDelete.id,
        teamId: teamId!,
        workspaceId,
      })
      setDeleteDialogOpen(false)
      setStrategyToDelete(null)
      setDetailSheetOpen(false)
      setSelectedStrategy(null)
      toast({
        title: 'Strategy deleted',
        description: 'The strategy and its children have been deleted.',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete strategy'
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    }
  }

  // Request delete (opens confirmation dialog)
  const requestDelete = (strategy: StrategyWithChildren) => {
    setStrategyToDelete(strategy)
    setDeleteDialogOpen(true)
  }

  // Add child strategy
  const handleAddChild = (parent: StrategyWithChildren) => {
    const childTypeMap: Record<StrategyType, StrategyType> = {
      pillar: 'objective',
      objective: 'key_result',
      key_result: 'initiative',
      initiative: 'initiative',
    }
    setSelectedParentId(parent.id)
    setSelectedType(childTypeMap[parent.type])
    setCreateDialogOpen(true)
  }

  // Open strategy detail sheet
  const handleStrategyClick = (strategy: StrategyWithChildren) => {
    setSelectedStrategy(strategy)
    setDetailSheetOpen(true)
  }

  // Open edit dialog from detail sheet
  const handleEditFromSheet = (strategy: StrategyWithChildren) => {
    setDetailSheetOpen(false)
    setSelectedStrategy(strategy)
    setEditDialogOpen(true)
  }

  // Add child from detail sheet
  const handleAddChildFromSheet = (parent: StrategyWithChildren) => {
    setDetailSheetOpen(false)
    handleAddChild(parent)
  }

  // Reorder strategy handler (drag-drop)
  const handleReorder = useCallback(
    async (params: { id: string; parentId: string | null; sortOrder: number }) => {
      try {
        await reorderMutation.mutateAsync({
          id: params.id,
          parentId: params.parentId,
          sortOrder: params.sortOrder,
          teamId: teamId!,
          workspaceId,
        })
        toast({
          title: 'Strategy reordered',
          description: 'The strategy has been moved successfully.',
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to reorder strategy'
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        })
      }
    },
    [reorderMutation, teamId, workspaceId, toast]
  )

  // Flatten strategies for list view
  const flattenStrategies = (items: StrategyWithChildren[]): StrategyWithChildren[] => {
    const result: StrategyWithChildren[] = []
    const flatten = (list: StrategyWithChildren[]) => {
      list.forEach((item) => {
        result.push(item)
        if (item.children?.length) {
          flatten(item.children)
        }
      })
    }
    flatten(items)
    return result
  }

  // Calculate summary stats from tree data
  const summaryStats = {
    pillars: strategies.length,
    objectives: strategies.reduce((acc, p) => acc + (p.children?.length || 0), 0),
    keyResults: strategies.reduce(
      (acc, p) =>
        acc + (p.children?.reduce((a, o) => a + (o.children?.length || 0), 0) || 0),
      0
    ),
    avgProgress:
      strategies.length > 0
        ? Math.round(
            strategies.reduce(
              (acc, s) =>
                acc + (s.progress_mode === 'auto' ? s.calculated_progress : s.progress),
              0
            ) / strategies.length
          )
        : 0,
  }

  // Loading state
  if (!teamId || (treeLoading && !strategies.length)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold">Product Strategy</h1>
            <p className="text-sm text-muted-foreground">
              OKRs, Pillars, and Strategic Alignment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchTree()}
            disabled={treeLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${treeLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setSelectedParentId(null)
                  setSelectedType('pillar')
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedParentId
                    ? `Add ${selectedType.replace('_', ' ')}`
                    : 'Create Strategy'}
                </DialogTitle>
              </DialogHeader>
              <StrategyForm
                mode="create"
                teamId={teamId!}
                workspaceId={workspaceId}
                parentStrategies={strategies}
                defaultParentId={selectedParentId || undefined}
                defaultType={selectedType}
                onSubmit={handleCreate}
                onCancel={() => {
                  setCreateDialogOpen(false)
                  setSelectedParentId(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="hierarchy" className="gap-2">
            <TreePine className="h-4 w-4" />
            <span className="hidden sm:inline">Hierarchy</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="ai-suggestions" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI</span>
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
              Pro
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Hierarchy Tab */}
        <TabsContent value="hierarchy" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-indigo-600">
                  {summaryStats.pillars}
                </div>
                <p className="text-sm text-muted-foreground">Pillars</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-600">
                  {summaryStats.objectives}
                </div>
                <p className="text-sm text-muted-foreground">Objectives</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-600">
                  {summaryStats.keyResults}
                </div>
                <p className="text-sm text-muted-foreground">Key Results</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-purple-600">
                  {summaryStats.avgProgress}%
                </div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </CardContent>
            </Card>
          </div>

          {/* Error State */}
          {treeError && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <CardContent className="pt-4">
                <p className="text-red-600 dark:text-red-400">{(treeError as Error).message}</p>
              </CardContent>
            </Card>
          )}

          {/* View Toggle */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
              >
                <TreePine className="h-4 w-4 mr-2" />
                Tree
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              {flattenStrategies(strategies).length} total strategies
            </Badge>
          </div>

          {/* Tree/List View */}
          {viewMode === 'tree' ? (
            strategies.length === 0 ? (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No strategies yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first pillar to start building your product strategy.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pillar
                </Button>
              </Card>
            ) : (
              <StrategyTree
                strategies={strategies}
                onSelect={handleStrategyClick}
                onEdit={handleStrategyClick}
                onDelete={requestDelete}
                onAddChild={handleAddChild}
                onReorder={handleReorder}
                enableDragDrop={true}
              />
            )
          ) : (
            <div className="grid gap-4">
              {flattenStrategies(strategies).map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onClick={() => handleStrategyClick(strategy)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <AlignmentDashboard
            stats={statsData?.data}
            isLoading={statsLoading}
            error={statsError as Error | null}
          />
        </TabsContent>

        {/* AI Suggestions Tab */}
        <TabsContent value="ai-suggestions" className="mt-6">
          {teamId && (
            <AIAlignmentSuggestions
              teamId={teamId}
              workspaceId={workspaceId}
              onSuggestionsApplied={() => {
                refetchTree()
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Strategy Detail Sheet */}
      <StrategyDetailSheet
        strategy={strategyDetail?.data || selectedStrategy}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEditFromSheet}
        onDelete={requestDelete}
        onAddChild={handleAddChildFromSheet}
        isLoading={detailLoading}
      />

      {/* Edit Dialog */}
      {selectedStrategy && editDialogOpen && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Strategy</DialogTitle>
            </DialogHeader>
            <StrategyForm
              mode="edit"
              strategy={selectedStrategy}
              teamId={teamId!}
              workspaceId={workspaceId}
              parentStrategies={strategies}
              onSubmit={(data) => handleUpdate(selectedStrategy.id, data)}
              onCancel={() => {
                setEditDialogOpen(false)
                setSelectedStrategy(null)
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{strategyToDelete?.title}&quot;?
              {strategyToDelete?.children && strategyToDelete.children.length > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This will also delete {strategyToDelete.children.length} child{' '}
                  {strategyToDelete.children.length === 1 ? 'strategy' : 'strategies'}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
