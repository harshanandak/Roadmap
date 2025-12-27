'use client'

/**
 * TemplateCard Component
 *
 * Displays a workspace template in a card format with:
 * - Icon and name
 * - Mode badge
 * - Description
 * - Preview summary (departments, work items, tags)
 * - System/Custom badge
 */

import {
  Rocket,
  Cloud,
  CheckCircle,
  Megaphone,
  MessageSquare,
  BarChart3,
  Wrench,
  Activity,
  LayoutTemplate,
  Sparkles,
  Zap,
  Layers,
  Briefcase,
  Users,
  Target,
  Flag,
  Compass,
  Map,
  Folder,
  FileText,
  LucideIcon,
  Building2,
  ListTodo,
  Tags,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { WorkspaceTemplate, isSystemTemplate } from '@/lib/templates/template-types'
import { WORKSPACE_MODE_CONFIG, WorkspaceMode } from '@/lib/types/workspace-mode'

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP: Record<string, LucideIcon> = {
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
  users: Users,
  target: Target,
  flag: Flag,
  compass: Compass,
  map: Map,
  folder: Folder,
  'file-text': FileText,
}

// ============================================================================
// COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: WorkspaceTemplate
  onSelect?: (template: WorkspaceTemplate) => void
  onPreview?: (template: WorkspaceTemplate) => void
  selected?: boolean
  className?: string
}

export function TemplateCard({
  template,
  onSelect,
  onPreview,
  selected = false,
  className,
}: TemplateCardProps) {
   
  const Icon = ICON_MAP[template.icon] ?? LayoutTemplate
  const modeConfig = WORKSPACE_MODE_CONFIG[template.mode as WorkspaceMode]
  const { departments, workItems, tags } = template.template_data

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary',
        className
      )}
      onClick={() => onSelect?.(template)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${modeConfig.color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color: modeConfig.color }} />
          </div>

          {/* Title & Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium">{template.name}</h3>
              {isSystemTemplate(template) && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  System
                </Badge>
              )}
            </div>

            {/* Mode Badge */}
            <Badge
              variant="outline"
              className="mt-1"
              style={{
                borderColor: modeConfig.color,
                color: modeConfig.color,
              }}
            >
              {modeConfig.name}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {template.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            <span>{departments.length} depts</span>
          </div>
          <div className="flex items-center gap-1">
            <ListTodo className="h-3.5 w-3.5" />
            <span>{workItems.length} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Tags className="h-3.5 w-3.5" />
            <span>{tags.length} tags</span>
          </div>
        </div>

        {/* Preview Button (appears on hover) */}
        {onPreview && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onPreview(template)
            }}
          >
            Preview
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default TemplateCard
