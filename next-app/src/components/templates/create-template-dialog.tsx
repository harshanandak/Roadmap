'use client'

/**
 * CreateTemplateDialog Component
 *
 * Dialog for creating a new team template from:
 * - Scratch (empty template)
 * - Current workspace (capture current state)
 */

import { useState } from 'react'
import {
  LayoutTemplate,
  Rocket,
  Cloud,
  CheckCircle,
  Megaphone,
  MessageSquare,
  BarChart3,
  Wrench,
  Activity,
  Sparkles,
  Zap,
  Layers,
  Briefcase,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { WorkspaceMode, WORKSPACE_MODE_CONFIG } from '@/lib/types/workspace-mode'
import { CreateTemplateInput } from '@/lib/templates/template-types'

// ============================================================================
// ICON COMPONENTS
// ============================================================================

const ICON_COMPONENTS = {
  'layout-template': LayoutTemplate,
  rocket: Rocket,
  cloud: Cloud,
  'check-circle': CheckCircle,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  'bar-chart-3': BarChart3,
  wrench: Wrench,
  activity: Activity,
  sparkles: Sparkles,
  zap: Zap,
  layers: Layers,
  briefcase: Briefcase,
} as const

// ============================================================================
// TYPES
// ============================================================================

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CreateTemplateInput) => Promise<void>
  /** If provided, template will be created from current workspace */
  workspaceId?: string
  /** Default mode for the template */
  defaultMode?: WorkspaceMode
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  workspaceId,
  defaultMode = 'development',
}: CreateTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState<string>('layout-template')
  const [mode, setMode] = useState<WorkspaceMode>(defaultMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Template name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        mode,
        template_data: {
          departments: [],
          workItems: [],
          tags: [],
        },
      })
      onOpenChange(false)
      // Reset form
      setName('')
      setDescription('')
      setIcon('layout-template')
      setMode(defaultMode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
          <DialogDescription>
            {workspaceId
              ? 'Save your current workspace setup as a reusable template.'
              : 'Create a new template for your team.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint Planning Template"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template includes..."
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <RadioGroup
              value={icon}
              onValueChange={setIcon}
              className="flex flex-wrap gap-2"
              disabled={isSubmitting}
            >
              {Object.entries(ICON_COMPONENTS).map(([iconName, IconComponent]) => (
                <div key={iconName}>
                  <RadioGroupItem
                    value={iconName}
                    id={`icon-${iconName}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`icon-${iconName}`}
                    className={cn(
                      'flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-2 transition-colors hover:bg-accent',
                      icon === iconName
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent'
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <Label htmlFor="mode">Mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as WorkspaceMode)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(WORKSPACE_MODE_CONFIG) as WorkspaceMode[]).map((m) => {
                  const config = WORKSPACE_MODE_CONFIG[m]
                  return (
                    <SelectItem key={m} value={m}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.name}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTemplateDialog
