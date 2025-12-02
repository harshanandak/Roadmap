'use client'

/**
 * TemplateGallery Component
 *
 * Displays workspace templates organized by mode with:
 * - Mode tabs for filtering
 * - Grid of template cards
 * - Search functionality
 * - Preview sheet
 * - System vs Team templates toggle
 */

import { useState, useMemo } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { TemplateCard } from './template-card'
import { TemplatePreview } from './template-preview'
import {
  WorkspaceTemplate,
  isSystemTemplate,
} from '@/lib/templates/template-types'
import { WORKSPACE_MODE_CONFIG, WorkspaceMode } from '@/lib/types/workspace-mode'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface TemplateGalleryProps {
  /** All available templates */
  templates: WorkspaceTemplate[]
  /** Currently selected template */
  selectedTemplate?: WorkspaceTemplate | null
  /** Callback when a template is selected */
  onSelect?: (template: WorkspaceTemplate) => void
  /** Callback when "Apply Template" is clicked in preview */
  onApply?: (template: WorkspaceTemplate) => void
  /** Callback to create a new template */
  onCreateTemplate?: () => void
  /** Default mode tab to show */
  defaultMode?: WorkspaceMode
  /** Whether to show the create button */
  showCreateButton?: boolean
  /** Whether to show system templates toggle */
  showSystemToggle?: boolean
  /** Additional class names */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TemplateGallery({
  templates,
  selectedTemplate,
  onSelect,
  onApply,
  onCreateTemplate,
  defaultMode = 'development',
  showCreateButton = true,
  showSystemToggle = true,
  className,
}: TemplateGalleryProps) {
  const [activeMode, setActiveMode] = useState<WorkspaceMode | 'all'>(defaultMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSystemOnly, setShowSystemOnly] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<WorkspaceTemplate | null>(null)

  // Filter templates based on mode, search, and system toggle
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Mode filter
      if (activeMode !== 'all' && template.mode !== activeMode) {
        return false
      }

      // System/Team filter
      if (showSystemOnly && !isSystemTemplate(template)) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = template.name.toLowerCase().includes(query)
        const matchesDesc = template.description?.toLowerCase().includes(query)
        const matchesTags = template.template_data.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        )
        if (!matchesName && !matchesDesc && !matchesTags) {
          return false
        }
      }

      return true
    })
  }, [templates, activeMode, showSystemOnly, searchQuery])

  // Count templates per mode
  const modeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length }
    for (const mode of Object.keys(WORKSPACE_MODE_CONFIG) as WorkspaceMode[]) {
      counts[mode] = templates.filter((t) => t.mode === mode).length
    }
    return counts
  }, [templates])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showSystemToggle && (
            <Button
              variant={showSystemOnly ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowSystemOnly(!showSystemOnly)}
            >
              <Filter className="mr-2 h-4 w-4" />
              System Only
            </Button>
          )}
          {showCreateButton && onCreateTemplate && (
            <Button size="sm" onClick={onCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs
        value={activeMode}
        onValueChange={(v) => setActiveMode(v as WorkspaceMode | 'all')}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {modeCounts.all}
            </Badge>
          </TabsTrigger>
          {(Object.keys(WORKSPACE_MODE_CONFIG) as WorkspaceMode[]).map((mode) => {
            const config = WORKSPACE_MODE_CONFIG[mode]
            return (
              <TabsTrigger key={mode} value={mode} className="gap-2">
                <span className="hidden sm:inline">{config.name}</span>
                <span className="sm:hidden">{config.name.slice(0, 3)}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {modeCounts[mode]}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Template Grid */}
        <TabsContent value={activeMode} className="mt-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <p className="text-muted-foreground">No templates found</p>
              {searchQuery && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  selected={selectedTemplate?.id === template.id}
                  onSelect={onSelect}
                  onPreview={setPreviewTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Sheet */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onApply={
          onApply
            ? (template) => {
                onApply(template)
                setPreviewTemplate(null)
              }
            : undefined
        }
      />
    </div>
  )
}

export default TemplateGallery
