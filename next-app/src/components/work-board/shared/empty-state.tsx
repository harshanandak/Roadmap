'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Package,
  ListTodo,
  Search,
  Plus,
  CheckSquare,
  Calendar,
  type LucideIcon,
} from 'lucide-react'

// Preset empty state configurations
export type EmptyStatePreset =
  | 'no-work-items'
  | 'no-tasks'
  | 'no-timeline-items'
  | 'no-filtered-results'
  | 'no-items-in-column'

interface EmptyStatePresetConfig {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
}

const presetConfigs: Record<EmptyStatePreset, EmptyStatePresetConfig> = {
  'no-work-items': {
    icon: Package,
    title: 'No work items yet',
    description: 'Create your first work item to start organizing your product roadmap.',
    actionLabel: 'Create Work Item',
  },
  'no-tasks': {
    icon: ListTodo,
    title: 'No tasks yet',
    description: 'Create tasks to track work that needs to be done.',
    actionLabel: 'Create Task',
  },
  'no-timeline-items': {
    icon: Calendar,
    title: 'No timeline items',
    description: 'Timeline items will appear here once you add them to your work items.',
    actionLabel: 'Add Timeline',
  },
  'no-filtered-results': {
    icon: Search,
    title: 'No results found',
    description: "Try adjusting your filters or search terms to find what you're looking for.",
    actionLabel: 'Clear Filters',
  },
  'no-items-in-column': {
    icon: CheckSquare,
    title: 'No items',
    description: 'Drag items here or create a new one.',
    actionLabel: 'Add Item',
  },
}

interface EmptyStateProps {
  // Use a preset for common empty states
  preset?: EmptyStatePreset
  // Or customize completely
  icon?: LucideIcon
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  // Optional secondary action
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  // Styling
  className?: string
  size?: 'sm' | 'md' | 'lg'
  // For inline/compact usage (e.g., in board columns)
  variant?: 'default' | 'inline' | 'card'
}

export function EmptyState({
  preset,
  icon: customIcon,
  title: customTitle,
  description: customDescription,
  actionLabel: customActionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  size = 'md',
  variant = 'default',
}: EmptyStateProps) {
  // Get config from preset or use custom values
  const config = preset ? presetConfigs[preset] : null
  const Icon = customIcon || config?.icon || Package
  const title = customTitle || config?.title || 'No items'
  const description = customDescription || config?.description || ''
  const actionLabel = customActionLabel || config?.actionLabel

  // Size-based styling
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'h-8 w-8',
      iconContainer: 'p-2',
      title: 'text-sm font-medium',
      description: 'text-xs',
      button: 'h-8 text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'h-10 w-10',
      iconContainer: 'p-3',
      title: 'text-base font-semibold',
      description: 'text-sm',
      button: 'h-9',
    },
    lg: {
      container: 'py-16',
      icon: 'h-12 w-12',
      iconContainer: 'p-4',
      title: 'text-lg font-semibold',
      description: 'text-base',
      button: 'h-10',
    },
  }

  const classes = sizeClasses[size]

  // Variant-based styling
  const variantClasses = {
    default: 'flex flex-col items-center justify-center text-center',
    inline: 'flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg',
    card: 'flex flex-col items-center justify-center text-center bg-muted/30 rounded-lg',
  }

  return (
    <div className={cn(variantClasses[variant], classes.container, className)}>
      {/* Icon */}
      <div className={cn('rounded-full bg-muted mb-3', classes.iconContainer)}>
        <Icon className={cn('text-muted-foreground', classes.icon)} />
      </div>

      {/* Title */}
      <h3 className={cn('text-foreground mb-1', classes.title)}>{title}</h3>

      {/* Description */}
      {description && (
        <p className={cn('text-muted-foreground max-w-xs mb-4', classes.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className="flex items-center gap-2">
          {actionLabel && onAction && (
            <Button onClick={onAction} size={size === 'sm' ? 'sm' : 'default'} className={classes.button}>
              <Plus className="h-4 w-4 mr-1" />
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              size={size === 'sm' ? 'sm' : 'default'}
              className={classes.button}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

// Quick-use components for common scenarios
interface QuickEmptyStateProps {
  onAction?: () => void
  onClearFilters?: () => void
  hasFilters?: boolean
  className?: string
}

export function TasksEmptyState({ onAction, onClearFilters, hasFilters, className }: QuickEmptyStateProps) {
  if (hasFilters) {
    return (
      <EmptyState
        preset="no-filtered-results"
        onAction={onClearFilters}
        className={className}
      />
    )
  }

  return (
    <EmptyState
      preset="no-tasks"
      onAction={onAction}
      className={className}
    />
  )
}

export function WorkItemsEmptyState({ onAction, onClearFilters, hasFilters, className }: QuickEmptyStateProps) {
  if (hasFilters) {
    return (
      <EmptyState
        preset="no-filtered-results"
        onAction={onClearFilters}
        className={className}
      />
    )
  }

  return (
    <EmptyState
      preset="no-work-items"
      onAction={onAction}
      className={className}
    />
  )
}

export function BoardColumnEmptyState({ onAction, className }: { onAction?: () => void; className?: string }) {
  return (
    <EmptyState
      preset="no-items-in-column"
      size="sm"
      variant="inline"
      onAction={onAction}
      className={className}
    />
  )
}
