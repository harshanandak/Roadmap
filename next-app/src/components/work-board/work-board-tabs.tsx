'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListTodo, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkBoardContext, type PrimaryTab } from './shared/filter-context'

interface WorkBoardTabsProps {
  className?: string
  workItemCount?: number
  taskCount?: number
}

export function WorkBoardTabs({
  className,
  workItemCount = 0,
  taskCount = 0,
}: WorkBoardTabsProps) {
  const { primaryTab, setPrimaryTab } = useWorkBoardContext()

  return (
    <Tabs
      value={primaryTab}
      onValueChange={(value) => setPrimaryTab(value as PrimaryTab)}
      className={className}
    >
      <TabsList className="h-10 p-1 bg-muted">
        <TabsTrigger
          value="work-items"
          className={cn(
            'flex items-center gap-2 px-4 h-8',
            'data-[state=active]:bg-background data-[state=active]:shadow-sm',
            'transition-all duration-200'
          )}
        >
          <LayoutList className="h-4 w-4" />
          <span className="font-medium">Work Items</span>
          {workItemCount > 0 && (
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full tabular-nums">
              {workItemCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="tasks"
          className={cn(
            'flex items-center gap-2 px-4 h-8',
            'data-[state=active]:bg-background data-[state=active]:shadow-sm',
            'transition-all duration-200'
          )}
        >
          <ListTodo className="h-4 w-4" />
          <span className="font-medium">Tasks</span>
          {taskCount > 0 && (
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full tabular-nums">
              {taskCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

// Standalone version for testing or embedding
interface WorkBoardTabsStandaloneProps {
  value: PrimaryTab
  onChange: (value: PrimaryTab) => void
  className?: string
  workItemCount?: number
  taskCount?: number
}

export function WorkBoardTabsStandalone({
  value,
  onChange,
  className,
  workItemCount = 0,
  taskCount = 0,
}: WorkBoardTabsStandaloneProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as PrimaryTab)}
      className={className}
    >
      <TabsList className="h-10 p-1 bg-muted">
        <TabsTrigger
          value="work-items"
          className={cn(
            'flex items-center gap-2 px-4 h-8',
            'data-[state=active]:bg-background data-[state=active]:shadow-sm',
            'transition-all duration-200'
          )}
        >
          <LayoutList className="h-4 w-4" />
          <span className="font-medium">Work Items</span>
          {workItemCount > 0 && (
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full tabular-nums">
              {workItemCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="tasks"
          className={cn(
            'flex items-center gap-2 px-4 h-8',
            'data-[state=active]:bg-background data-[state=active]:shadow-sm',
            'transition-all duration-200'
          )}
        >
          <ListTodo className="h-4 w-4" />
          <span className="font-medium">Tasks</span>
          {taskCount > 0 && (
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full tabular-nums">
              {taskCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
