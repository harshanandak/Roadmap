/**
 * AgenticPanel Component
 *
 * Main AI assistant panel with agentic mode capabilities.
 * Features tool suggestions, approval workflow, and action history.
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Bot,
  Sparkles,
  Shield,
  History,
  Wrench,
  ChevronRight,
  Settings,
  Loader2,
  Plus,
  Search,
  Zap,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgent } from '@/lib/hooks/use-agent'
import { useActionHistory, usePendingActions } from '@/lib/hooks/use-action-history'
import { ToolPreviewCard, type ToolPreviewData } from './tool-preview-card'
import { ApprovalDialog, type PendingAction } from './approval-dialog'
import { ActionHistoryList } from './action-history-list'

interface AgenticPanelProps {
  workspaceId: string
  teamId: string
  className?: string
}

// Tool category definitions for the UI
const toolCategories = [
  {
    id: 'creation',
    name: 'Create',
    icon: Plus,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    tools: [
      { name: 'createWorkItem', label: 'Work Item', description: 'Create a new feature, bug, or enhancement' },
      { name: 'createTask', label: 'Task', description: 'Create an execution task' },
      { name: 'createDependency', label: 'Dependency', description: 'Link work items together' },
      { name: 'createTimelineItem', label: 'Timeline', description: 'Add MVP/Short/Long breakdown' },
      { name: 'createInsight', label: 'Insight', description: 'Add a research insight' },
    ],
  },
  {
    id: 'analysis',
    name: 'Analyze',
    icon: Search,
    color: 'text-violet-600',
    bgColor: 'bg-violet-500/10',
    tools: [
      { name: 'analyzeFeedback', label: 'Feedback', description: 'Analyze user feedback patterns' },
      { name: 'suggestDependencies', label: 'Dependencies', description: 'Find missing dependencies' },
      { name: 'findGaps', label: 'Gap Analysis', description: 'Identify coverage gaps' },
      { name: 'summarizeWorkItem', label: 'Summarize', description: 'Generate work item summary' },
      { name: 'extractRequirements', label: 'Requirements', description: 'Extract requirements from text' },
    ],
  },
  {
    id: 'optimization',
    name: 'Optimize',
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    tools: [
      { name: 'prioritizeFeatures', label: 'Prioritize', description: 'AI-powered prioritization' },
      { name: 'balanceWorkload', label: 'Workload', description: 'Balance team assignments' },
      { name: 'identifyRisks', label: 'Risks', description: 'Identify project risks' },
      { name: 'suggestTimeline', label: 'Timeline', description: 'Suggest optimal timeline' },
      { name: 'deduplicateItems', label: 'Deduplicate', description: 'Find duplicate items' },
    ],
  },
  {
    id: 'strategy',
    name: 'Strategy',
    icon: Target,
    color: 'text-sky-600',
    bgColor: 'bg-sky-500/10',
    tools: [
      { name: 'alignToStrategy', label: 'Alignment', description: 'Check OKR/pillar alignment' },
      { name: 'suggestOKRs', label: 'OKRs', description: 'Generate OKR suggestions' },
      { name: 'competitiveAnalysis', label: 'Competitive', description: 'Analyze competition' },
      { name: 'roadmapGenerator', label: 'Roadmap', description: 'Generate strategic roadmap' },
      { name: 'impactAssessment', label: 'Impact', description: 'Assess business impact' },
    ],
  },
]

export function AgenticPanel({ workspaceId, teamId, className }: AgenticPanelProps) {
  const [activeTab, setActiveTab] = useState('tools')
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [currentPreview, setCurrentPreview] = useState<ToolPreviewData | null>(null)

  // Hooks
  const agent = useAgent({ workspaceId, teamId })
  const history = useActionHistory({
    workspaceId,
    autoRefresh: true,
    refreshInterval: 10000,
  })
  const pending = usePendingActions(workspaceId)

  // Handle tool selection and preview
  const handleToolSelect = useCallback(
    async (toolName: string) => {
      setSelectedTool(toolName)

      // Get preview with minimal params for demo
      // In production, this would open a params dialog first
      const preview = await agent.preview(toolName, {
        workspaceId,
        teamId,
      })

      if (preview) {
        setCurrentPreview(preview)
      }
    },
    [agent, workspaceId, teamId]
  )

  // Handle tool execution
  const handleExecute = useCallback(async () => {
    if (!selectedTool) return

    const result = await agent.execute(selectedTool, {
      workspaceId,
      teamId,
    })

    if (result?.requiresApproval) {
      // Show approval dialog
      setShowApprovalDialog(true)
    }

    // Clear preview after execution
    setCurrentPreview(null)
    setSelectedTool(null)
  }, [agent, selectedTool, workspaceId, teamId])

  // Handle approval
  const handleApprove = useCallback(
    async (actionId: string) => {
      await agent.approve(actionId)
      await history.refresh()
    },
    [agent, history]
  )

  // Handle batch approval
  const handleApproveAll = useCallback(
    async (actionIds: string[]) => {
      await agent.approveAll(actionIds)
      await history.refresh()
    },
    [agent, history]
  )

  // Handle rejection
  const handleReject = useCallback(
    async (actionId: string, reason?: string) => {
      await agent.reject(actionId, reason)
      await history.refresh()
    },
    [agent, history]
  )

  // Handle rollback
  const handleRollback = useCallback(
    async (actionId: string) => {
      await agent.rollback(actionId)
      await history.refresh()
    },
    [agent, history]
  )

  // Convert pending actions for dialog
  const pendingForDialog: PendingAction[] = pending.pending.map((action) => ({
    id: action.id,
    toolName: action.tool_name,
    displayName: action.tool_name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim(),
    category: action.tool_category,
    params: action.tool_params,
    preview: {
      action: 'create' as const,
      entityType: 'item',
      data: action.tool_params,
      description: `Execute ${action.tool_name}`,
    },
    requiresApproval: action.requires_approval,
    isReversible: action.is_reversible,
    createdAt: action.created_at,
  }))

  return (
    <>
      <Card className={cn('flex flex-col h-full', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">AI Assistant</CardTitle>
                <p className="text-xs text-muted-foreground">Agentic Mode</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Pending Approvals Badge */}
              {pending.hasPending && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApprovalDialog(true)}
                  className="relative"
                >
                  <Shield className="h-4 w-4" />
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {pending.count}
                  </Badge>
                </Button>
              )}

              {/* Settings */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>AI Settings</SheetTitle>
                    <SheetDescription>
                      Configure AI assistant behavior and preferences.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-approve safe actions</p>
                        <p className="text-xs text-muted-foreground">
                          Skip approval for read-only operations
                        </p>
                      </div>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Notification sound</p>
                        <p className="text-xs text-muted-foreground">
                          Play sound for pending approvals
                        </p>
                      </div>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 p-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-10 px-2">
              <TabsTrigger
                value="tools"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Wrench className="h-4 w-4 mr-1.5" />
                Tools
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <History className="h-4 w-4 mr-1.5" />
                History
                {history.stats.total > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 text-[10px]">
                    {history.stats.total}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tools Tab */}
            <TabsContent value="tools" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {/* Current Preview */}
                  {currentPreview && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Preview</span>
                      </div>
                      <ToolPreviewCard
                        preview={currentPreview}
                        onApprove={handleExecute}
                        onReject={() => {
                          setCurrentPreview(null)
                          setSelectedTool(null)
                        }}
                        isApproving={agent.isExecuting}
                      />
                    </div>
                  )}

                  {/* Tool Categories */}
                  {!currentPreview &&
                    toolCategories.map((category) => (
                      <div key={category.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn('rounded-md p-1', category.bgColor)}>
                            <category.icon className={cn('h-4 w-4', category.color)} />
                          </div>
                          <span className="text-sm font-medium">{category.name}</span>
                        </div>

                        <div className="grid gap-2">
                          {category.tools.map((tool) => (
                            <button
                              key={tool.name}
                              onClick={() => handleToolSelect(tool.name)}
                              disabled={agent.isPreviewing}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                                'hover:bg-muted/50 hover:border-primary/50',
                                selectedTool === tool.name && 'border-primary bg-primary/5',
                                agent.isPreviewing && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              <div>
                                <p className="text-sm font-medium">{tool.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {tool.description}
                                </p>
                              </div>
                              {agent.isPreviewing && selectedTool === tool.name ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 m-0">
              <ActionHistoryList
                actions={history.actions}
                isLoading={history.isLoading}
                onRollback={handleRollback}
                onRefresh={history.refresh}
                onFilterChange={(filters) => history.setFilters(filters)}
                className="border-0 rounded-none shadow-none h-full"
              />
            </TabsContent>
          </Tabs>
        </CardContent>

        {/* Error Display */}
        {agent.error && (
          <div className="border-t bg-red-500/10 px-4 py-2">
            <p className="text-xs text-red-600">{agent.error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={agent.clearError}
              className="h-6 text-xs mt-1"
            >
              Dismiss
            </Button>
          </div>
        )}
      </Card>

      {/* Approval Dialog */}
      <ApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        pendingActions={pendingForDialog}
        onApprove={handleApprove}
        onApproveAll={handleApproveAll}
        onReject={handleReject}
        isProcessing={agent.isApproving}
      />
    </>
  )
}

export default AgenticPanel
