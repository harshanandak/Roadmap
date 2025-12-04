'use client'

/**
 * ToolConfirmationCard Component
 *
 * Displays an inline confirmation card in the chat when the AI proposes an action.
 * Shows extracted parameters and provides [Confirm] [Edit] [Cancel] buttons.
 *
 * Used in the chat-first AI experience to preview tool actions before execution.
 * Integrates with the existing agentExecutor approval workflow.
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  X,
  Pencil,
  Loader2,
  FileText,
  CheckSquare,
  Link2,
  Calendar,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react'
import type { ToolCategory as ToolCategoryType } from '@/lib/ai/schemas/agentic-schemas'

// =============================================================================
// TYPES
// =============================================================================

export interface ConfirmationParams {
  [key: string]: unknown
}

export interface ToolConfirmationData {
  toolName: string
  displayName: string
  category: ToolCategoryType
  params: ConfirmationParams
  description: string
  warnings?: string[]
}

export interface ToolConfirmationCardProps {
  data: ToolConfirmationData
  onConfirm: (params: ConfirmationParams) => void
  onEdit: (params: ConfirmationParams) => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

// =============================================================================
// HELPERS
// =============================================================================

const categoryConfig: Record<ToolCategoryType, { color: string; bgColor: string }> = {
  creation: { color: 'text-green-700', bgColor: 'bg-green-50' },
  analysis: { color: 'text-blue-700', bgColor: 'bg-blue-50' },
  optimization: { color: 'text-amber-700', bgColor: 'bg-amber-50' },
  strategy: { color: 'text-purple-700', bgColor: 'bg-purple-50' },
}

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  createWorkItem: FileText,
  createTask: CheckSquare,
  createDependency: Link2,
  createTimelineItem: Calendar,
  createInsight: Lightbulb,
}

function getToolIcon(toolName: string) {
  return toolIcons[toolName] || FileText
}

function formatParamLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace('Id', 'ID')
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.join(', ') || '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// =============================================================================
// PARAM FIELDS (for edit mode)
// =============================================================================

interface ParamFieldProps {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}

function ParamField({ name, value, onChange }: ParamFieldProps) {
  // Handle different param types
  if (name === 'type') {
    return (
      <Select value={String(value || '')} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="concept">Concept</SelectItem>
          <SelectItem value="feature">Feature</SelectItem>
          <SelectItem value="bug">Bug</SelectItem>
          <SelectItem value="enhancement">Enhancement</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (name === 'priority') {
    return (
      <Select value={String(value || 'medium')} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (name === 'timeframe') {
    return (
      <Select value={String(value || '')} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mvp">MVP</SelectItem>
          <SelectItem value="short">Short-term</SelectItem>
          <SelectItem value="long">Long-term</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  // Default: text input
  return (
    <Input
      value={String(value || '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${formatParamLabel(name).toLowerCase()}`}
    />
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ToolConfirmationCard({
  data,
  onConfirm,
  onEdit,
  onCancel,
  isLoading = false,
  className,
}: ToolConfirmationCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedParams, setEditedParams] = useState<ConfirmationParams>(data.params)

  const { color, bgColor } = categoryConfig[data.category]
  const IconComponent = getToolIcon(data.toolName)

  // Filter out internal params that shouldn't be displayed
  const displayParams = Object.entries(data.params).filter(
    ([key]) => !['workspaceId', 'teamId'].includes(key)
  )

  const handleConfirm = useCallback(() => {
    if (isEditing) {
      onConfirm(editedParams)
    } else {
      onConfirm(data.params)
    }
  }, [isEditing, editedParams, data.params, onConfirm])

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      // Cancel edit - reset to original
      setEditedParams(data.params)
    }
    setIsEditing(!isEditing)
  }, [isEditing, data.params])

  const handleParamChange = useCallback((key: string, value: unknown) => {
    setEditedParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <Card className={cn('w-full max-w-md', bgColor, 'border-l-4', className)} style={{
      borderLeftColor: color.includes('green') ? '#16a34a' :
                       color.includes('blue') ? '#2563eb' :
                       color.includes('amber') ? '#d97706' : '#9333ea'
    }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={cn('h-5 w-5', color)} />
            <CardTitle className="text-base">{data.displayName}</CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-xs', color)}>
            {data.category}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {data.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2">
          {displayParams.map(([key, value]) => (
            <div key={key} className="flex items-start gap-2">
              <Label className="w-24 text-xs text-muted-foreground pt-2 flex-shrink-0">
                {formatParamLabel(key)}:
              </Label>
              <div className="flex-1">
                {isEditing ? (
                  <ParamField
                    name={key}
                    value={editedParams[key]}
                    onChange={(newValue) => handleParamChange(key, newValue)}
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {formatParamValue(value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <div className="mt-3 p-2 bg-amber-100 rounded-md border border-amber-200">
            {data.warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        {/* Confirm Button */}
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              {isEditing ? 'Save & Confirm' : 'Confirm'}
            </>
          )}
        </Button>

        {/* Edit Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleToggleEdit}
          disabled={isLoading}
        >
          <Pencil className="h-4 w-4 mr-1.5" />
          {isEditing ? 'Cancel Edit' : 'Edit'}
        </Button>

        {/* Cancel Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

// =============================================================================
// SIMPLE PREVIEW CARD (Non-interactive, for completed actions)
// =============================================================================

export interface CompletedActionCardProps {
  toolName: string
  displayName: string
  category: ToolCategoryType
  params: ConfirmationParams
  result?: Record<string, unknown>
  status: 'completed' | 'failed'
  className?: string
}

export function CompletedActionCard({
  toolName,
  displayName,
  category,
  params,
  result,
  status,
  className,
}: CompletedActionCardProps) {
  const { color, bgColor } = categoryConfig[category]
  const IconComponent = getToolIcon(toolName)

  const displayParams = Object.entries(params).filter(
    ([key]) => !['workspaceId', 'teamId'].includes(key)
  )

  return (
    <Card className={cn('w-full max-w-md opacity-80', bgColor, className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className={cn('h-4 w-4', color)} />
            <CardTitle className="text-sm">{displayName}</CardTitle>
          </div>
          <Badge
            variant={status === 'completed' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {status === 'completed' ? '✓ Done' : '✗ Failed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="text-xs text-muted-foreground space-y-1">
          {displayParams.slice(0, 3).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{formatParamLabel(key)}:</span>{' '}
              {formatParamValue(value)}
            </div>
          ))}
          {displayParams.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{displayParams.length - 3} more fields
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ToolConfirmationCard
