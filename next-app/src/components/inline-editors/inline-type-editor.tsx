'use client'

/**
 * InlineTypeEditor Component
 *
 * Inline editor for work item type field.
 * Shows type badge, click to change.
 */

import { Sparkles, Bug, Zap, Lightbulb } from 'lucide-react'
import { InlineSelect, SelectOption } from './inline-select'

// ============================================================================
// TYPE OPTIONS
// ============================================================================

const TYPE_OPTIONS: SelectOption[] = [
  {
    value: 'concept',
    label: 'Concept',
    icon: <Lightbulb className="h-3 w-3" />,
    color: '#8b5cf6',
    description: 'Unvalidated idea',
  },
  {
    value: 'feature',
    label: 'Feature',
    icon: <Sparkles className="h-3 w-3" />,
    color: '#6366f1',
    description: 'New functionality',
  },
  {
    value: 'bug',
    label: 'Bug',
    icon: <Bug className="h-3 w-3" />,
    color: '#ef4444',
    description: 'Something broken',
  },
  {
    value: 'enhancement',
    label: 'Enhancement',
    icon: <Zap className="h-3 w-3" />,
    color: '#f59e0b',
    description: 'Improvement to existing',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

interface InlineTypeEditorProps {
  value: string
  onValueChange: (value: string) => Promise<void>
  disabled?: boolean
  className?: string
  variant?: 'badge' | 'button' | 'ghost'
}

export function InlineTypeEditor({
  value,
  onValueChange,
  disabled = false,
  className,
  variant = 'badge',
}: InlineTypeEditorProps) {
  return (
    <InlineSelect
      value={value || 'feature'}
      options={TYPE_OPTIONS}
      onValueChange={onValueChange}
      disabled={disabled}
      className={className}
      variant={variant}
      placeholder="Set type"
    />
  )
}

export default InlineTypeEditor
