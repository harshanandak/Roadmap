'use client'

/**
 * InlinePriorityEditor Component
 *
 * Inline editor for work item priority field.
 * Shows priority badge, click to change.
 */

import { ArrowDown, ArrowRight, ArrowUp, AlertTriangle } from 'lucide-react'
import { InlineSelect, SelectOption } from './inline-select'

// ============================================================================
// PRIORITY OPTIONS
// ============================================================================

const PRIORITY_OPTIONS: SelectOption[] = [
  {
    value: 'low',
    label: 'Low',
    icon: <ArrowDown className="h-3 w-3" />,
    color: '#22c55e',
  },
  {
    value: 'medium',
    label: 'Medium',
    icon: <ArrowRight className="h-3 w-3" />,
    color: '#f59e0b',
  },
  {
    value: 'high',
    label: 'High',
    icon: <ArrowUp className="h-3 w-3" />,
    color: '#f97316',
  },
  {
    value: 'critical',
    label: 'Critical',
    icon: <AlertTriangle className="h-3 w-3" />,
    color: '#ef4444',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

interface InlinePriorityEditorProps {
  value: string | null
  onValueChange: (value: string) => Promise<void>
  disabled?: boolean
  className?: string
  variant?: 'badge' | 'button' | 'ghost'
}

export function InlinePriorityEditor({
  value,
  onValueChange,
  disabled = false,
  className,
  variant = 'badge',
}: InlinePriorityEditorProps) {
  return (
    <InlineSelect
      value={value || 'medium'}
      options={PRIORITY_OPTIONS}
      onValueChange={onValueChange}
      disabled={disabled}
      className={className}
      variant={variant}
      placeholder="Set priority"
    />
  )
}

export default InlinePriorityEditor
