/**
 * ActionHistoryList Component
 *
 * Displays a timeline of past AI actions with filtering, status badges,
 * and rollback capability for reversible actions.
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Pencil,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActionHistoryItem } from '@/lib/hooks/use-action-history'

interface ActionHistoryListProps {
  actions: ActionHistoryItem[]
  isLoading?: boolean
  onRollback?: (actionId: string, reason?: string) => Promise<void>
  onRefresh?: () => Promise<void>
  onFilterChange?: (filter: { status?: string; category?: string }) => void
  className?: string
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    label: 'Pending',
  },
  approved: {
    icon: CheckCircle2,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    label: 'Approved',
  },
  executing: {
    icon: Loader2,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    label: 'Executing',
  },
  completed: {
    icon: CheckCircle2,
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    label: 'Failed',
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    label: 'Cancelled',
  },
  rolled_back: {
    icon: RotateCcw,
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    label: 'Rolled Back',
  },
}

const categoryIcons: Record<string, typeof Plus> = {
  creation: Plus,
  analysis: Search,
  optimization: Pencil,
  strategy: Search,
}

export function ActionHistoryList({
  actions,
  isLoading = false,
  onRollback,
  onRefresh,
  onFilterChange,
  className,
}: ActionHistoryListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    onFilterChange?.({
      status: value === 'all' ? undefined : value,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
    })
  }

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value)
    onFilterChange?.({
      status: statusFilter === 'all' ? undefined : statusFilter,
      category: value === 'all' ? undefined : value,
    })
  }

  const handleRollback = async (actionId: string) => {
    if (!onRollback) return
    setRollingBackId(actionId)
    try {
      await onRollback(actionId)
    } finally {
      setRollingBackId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getToolDisplayName = (toolName: string): string => {
    // Convert camelCase to Title Case with spaces
    return toolName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  // Get unique categories from actions for filter
  const categories = Array.from(new Set(actions.map((a) => a.tool_category).filter(Boolean)))

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Action History</CardTitle>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-2">
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rolled_back">Rolled Back</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {isLoading && actions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No actions yet</p>
            <p className="text-xs text-muted-foreground">
              AI actions will appear here as they execute.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {actions.map((action: ActionHistoryItem) => {
                const status = statusConfig[action.status] || statusConfig.pending
                const StatusIcon = status.icon
                const CategoryIcon = categoryIcons[action.tool_category] || Search
                const isExpanded = expandedIds.has(action.id)
                const canRollback =
                  action.status === 'completed' &&
                  action.is_reversible &&
                  onRollback

                return (
                  <Collapsible
                    key={action.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(action.id)}
                  >
                    <div className="px-4 py-3 hover:bg-muted/50 transition-colors">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-start gap-3">
                          {/* Category Icon */}
                          <div className="mt-0.5 rounded-md bg-muted p-1.5">
                            <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {getToolDisplayName(action.tool_name)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn('text-[10px] px-1.5 py-0', status.color)}
                              >
                                <StatusIcon
                                  className={cn(
                                    'h-2.5 w-2.5 mr-1',
                                    action.status === 'executing' && 'animate-spin'
                                  )}
                                />
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(action.created_at)}
                              {action.error_message && (
                                <span className="text-red-500 ml-2">
                                  • {action.error_message}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Expand Icon */}
                          <div className="mt-1">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      {/* Expanded Content */}
                      <CollapsibleContent>
                        <div className="mt-3 ml-9 space-y-3">
                          {/* Parameters */}
                          {action.tool_params && Object.keys(action.tool_params).length > 0 && (
                            <div className="rounded-md bg-muted/50 p-2">
                              <p className="text-xs font-medium mb-1">Parameters</p>
                              <pre className="text-xs overflow-auto max-h-32">
                                {JSON.stringify(action.tool_params, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Result or Error */}
                          {action.result_data != null && (
                            <div className="rounded-md bg-green-500/10 p-2">
                              <p className="text-xs font-medium text-green-700 mb-1">Result</p>
                              <pre className="text-xs overflow-auto max-h-32">
                                {JSON.stringify(action.result_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          {action.error_message && action.status === 'failed' && (
                            <div className="rounded-md bg-red-500/10 p-2">
                              <p className="text-xs font-medium text-red-700 mb-1">Error</p>
                              <p className="text-xs text-red-600">{action.error_message}</p>
                            </div>
                          )}

                          {/* Rollback Button */}
                          {canRollback && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={rollingBackId === action.id}
                                >
                                  {rollingBackId === action.id ? (
                                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                  ) : (
                                    <RotateCcw className="mr-1.5 h-3 w-3" />
                                  )}
                                  Undo Action
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Undo this action?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reverse the &quot;{getToolDisplayName(action.tool_name)}&quot;
                                    action. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRollback(action.id)}
                                    className="bg-amber-600 hover:bg-amber-700"
                                  >
                                    Undo Action
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default ActionHistoryList
