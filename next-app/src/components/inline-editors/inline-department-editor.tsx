'use client'

/**
 * InlineDepartmentEditor Component
 *
 * Inline editor for work item department field.
 * Fetches department options from the API.
 */

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InlineSelect, SelectOption } from './inline-select'

// ============================================================================
// TYPES
// ============================================================================

interface Department {
  id: string
  name: string
  color: string
  icon?: string
}

interface InlineDepartmentEditorProps {
  value: string | null
  teamId: string
  onValueChange: (value: string) => Promise<void>
  disabled?: boolean
  className?: string
  variant?: 'badge' | 'button' | 'ghost'
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InlineDepartmentEditor({
  value,
  teamId,
  onValueChange,
  disabled = false,
  className,
  variant = 'badge',
}: InlineDepartmentEditorProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function loadDepartments() {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, color, icon')
        .eq('team_id', teamId)
        .order('name')

      if (!error && data) {
        setDepartments(data)
      }
      setLoading(false)
    }

    loadDepartments()
  }, [teamId, supabase])

  const options: SelectOption[] = [
    {
      value: '',
      label: 'No Department',
      icon: <Building2 className="h-3 w-3 opacity-50" />,
      color: '#6b7280',
    },
    ...departments.map((dept) => ({
      value: dept.id,
      label: dept.name,
      icon: <Building2 className="h-3 w-3" style={{ color: dept.color }} />,
      color: dept.color,
    })),
  ]

  if (loading) {
    return (
      <span className="text-xs text-muted-foreground">Loading...</span>
    )
  }

  return (
    <InlineSelect
      value={value || ''}
      options={options}
      onValueChange={onValueChange}
      disabled={disabled}
      className={className}
      variant={variant}
      placeholder="Set department"
      showSearch={departments.length > 5}
    />
  )
}

export default InlineDepartmentEditor
