'use client'

/**
 * InlineStatusEditor Component
 *
 * Inline editor for work item status field.
 * Shows status badge, click to change.
 */

import { Circle, Clock, CheckCircle, PauseCircle } from 'lucide-react'
import { InlineSelect, SelectOption } from './inline-select'

// ============================================================================
// STATUS OPTIONS
// ============================================================================

const STATUS_OPTIONS: SelectOption[] = [
  {
    value: 'planned',
    label: 'Planned',
    icon: <Circle className="h-3 w-3" />,
    color: '#64748b',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: <Clock className="h-3 w-3" />,
    color: '#3b82f6',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: <CheckCircle className="h-3 w-3" />,
    color: '#22c55e',
  },
  {
    value: 'on_hold',
    label: 'On Hold',
    icon: <PauseCircle className="h-3 w-3" />,
    color: '#f97316',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

interface InlineStatusEditorProps {
  value: string
  onValueChange: (value: string) => Promise<void>
  disabled?: boolean
  className?: string
  variant?: 'badge' | 'button' | 'ghost'
}

export function InlineStatusEditor({
  value,
  onValueChange,
  disabled = false,
  className,
  variant = 'badge',
}: InlineStatusEditorProps) {
  return (
    <InlineSelect
      value={value || 'planned'}
      options={STATUS_OPTIONS}
      onValueChange={onValueChange}
      disabled={disabled}
      className={className}
      variant={variant}
      placeholder="Set status"
    />
  )
}

export default InlineStatusEditor
