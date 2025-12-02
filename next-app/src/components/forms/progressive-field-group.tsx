'use client'

/**
 * ProgressiveFieldGroup Component
 *
 * A collapsible field group for progressive disclosure in forms.
 * Works with ProgressiveForm context to manage visibility.
 */

import { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useProgressiveFormContext } from './progressive-form'

// ============================================================================
// TYPES
// ============================================================================

type FieldGroupType = 'essential' | 'expanded'

interface ProgressiveFieldGroupProps {
  /** Type of field group */
  group: FieldGroupType
  /** Custom label for the group trigger (only for 'expanded') */
  label?: string
  /** Children to render in this group */
  children: ReactNode
  /** Additional class names for the content */
  className?: string
  /** Whether this group should always be expanded (ignores context) */
  alwaysExpanded?: boolean
  /** Custom trigger component */
  customTrigger?: ReactNode
  /** Show a divider above the group */
  showDivider?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ProgressiveFieldGroup wraps form fields and provides collapsible behavior.
 *
 * @example
 * ```tsx
 * // Essential fields - always visible
 * <ProgressiveFieldGroup group="essential">
 *   <NameField />
 *   <TypeField />
 * </ProgressiveFieldGroup>
 *
 * // Expanded fields - collapsible
 * <ProgressiveFieldGroup
 *   group="expanded"
 *   label="Advanced options"
 *   showDivider
 * >
 *   <PriorityField />
 *   <DepartmentField />
 * </ProgressiveFieldGroup>
 * ```
 */
export function ProgressiveFieldGroup({
  group,
  label,
  children,
  className,
  alwaysExpanded = false,
  customTrigger,
  showDivider = false,
}: ProgressiveFieldGroupProps) {
  const context = useProgressiveFormContext()
  const { isExpanded, toggleExpanded, expandedFieldCount } = context

  // Essential group is always visible
  if (group === 'essential' || alwaysExpanded) {
    return (
      <div className={cn('space-y-4', className)}>
        {children}
      </div>
    )
  }

  // Expanded group is collapsible
  const defaultLabel = `Show ${expandedFieldCount} more option${expandedFieldCount !== 1 ? 's' : ''}`
  const displayLabel = label || defaultLabel
  const collapsedLabel = isExpanded
    ? 'Show less'
    : displayLabel

  return (
    <Collapsible open={isExpanded} onOpenChange={toggleExpanded}>
      {/* Divider */}
      {showDivider && (
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
        </div>
      )}

      {/* Trigger */}
      <CollapsibleTrigger asChild>
        {customTrigger || (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-between text-muted-foreground hover:text-foreground',
              'px-2 py-1 h-auto font-normal',
              isExpanded && 'text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              {collapsedLabel}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </CollapsibleTrigger>

      {/* Content */}
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className={cn('space-y-4 pt-4', className)}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============================================================================
// ADDITIONAL COMPONENTS
// ============================================================================

interface ShowMoreTriggerProps {
  /** Number of hidden fields */
  count: number
  /** Whether currently expanded */
  isExpanded: boolean
  /** Click handler */
  onClick: () => void
  /** Additional class names */
  className?: string
}

/**
 * Standalone "Show more" trigger button
 * Can be used outside of ProgressiveFieldGroup for custom layouts
 */
export function ShowMoreTrigger({
  count,
  isExpanded,
  onClick,
  className,
}: ShowMoreTriggerProps) {
  const label = isExpanded
    ? 'Show less'
    : `Show ${count} more option${count !== 1 ? 's' : ''}`

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        'px-2 py-1 h-auto font-normal',
        isExpanded && 'text-foreground',
        className
      )}
    >
      <span className="flex items-center gap-2">
        <Settings2 className="h-4 w-4" />
        {label}
      </span>
      {isExpanded ? (
        <ChevronUp className="h-4 w-4 ml-2" />
      ) : (
        <ChevronDown className="h-4 w-4 ml-2" />
      )}
    </Button>
  )
}

/**
 * Simple divider between field groups
 */
export function FieldGroupDivider({ className }: { className?: string }) {
  return (
    <div className={cn('relative my-4', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
    </div>
  )
}

export default ProgressiveFieldGroup
