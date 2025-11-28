'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, LayoutGrid, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkBoardContext, type ViewMode } from './shared/filter-context'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ViewModeToggleProps {
  className?: string
  disabled?: boolean
}

const viewModes: { value: ViewMode; label: string; icon: typeof Table; description: string }[] = [
  {
    value: 'table',
    label: 'Table',
    icon: Table,
    description: 'View items in a sortable table with columns',
  },
  {
    value: 'board',
    label: 'Board',
    icon: LayoutGrid,
    description: 'Kanban board with drag-and-drop by status',
  },
  {
    value: 'timeline',
    label: 'Timeline',
    icon: Calendar,
    description: 'View items on a timeline by due date',
  },
]

export function ViewModeToggle({ className, disabled = false }: ViewModeToggleProps) {
  const { viewMode, setViewMode } = useWorkBoardContext()

  return (
    <TooltipProvider delayDuration={300}>
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => {
          if (value) setViewMode(value as ViewMode)
        }}
        className={cn('bg-muted p-1 rounded-lg', className)}
        disabled={disabled}
      >
        {viewModes.map((mode) => (
          <Tooltip key={mode.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={mode.value}
                aria-label={mode.label}
                className={cn(
                  'data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5',
                  'transition-all duration-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <mode.icon className="h-4 w-4" />
                <span className="sr-only">{mode.label}</span>
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="font-medium">{mode.label}</p>
              <p className="text-xs text-muted-foreground">{mode.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  )
}

// Standalone version that doesn't use context (for testing or embedding)
interface ViewModeToggleStandaloneProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
  disabled?: boolean
}

export function ViewModeToggleStandalone({
  value,
  onChange,
  className,
  disabled = false,
}: ViewModeToggleStandaloneProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v as ViewMode)
        }}
        className={cn('bg-muted p-1 rounded-lg', className)}
        disabled={disabled}
      >
        {viewModes.map((mode) => (
          <Tooltip key={mode.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={mode.value}
                aria-label={mode.label}
                className={cn(
                  'data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5',
                  'transition-all duration-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <mode.icon className="h-4 w-4" />
                <span className="sr-only">{mode.label}</span>
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="font-medium">{mode.label}</p>
              <p className="text-xs text-muted-foreground">{mode.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  )
}
