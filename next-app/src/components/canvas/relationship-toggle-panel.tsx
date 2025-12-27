'use client'

/**
 * Relationship Toggle Panel
 *
 * 5-toggle filter system for different relationship types:
 * 1. Dependencies (blocks, depends_on)
 * 2. Enablements (enables, complements)
 * 3. Conflicts (conflicts, duplicates, supersedes)
 * 4. Related (relates_to)
 * 5. All (show all relationships)
 *
 * Visual feedback and real-time edge filtering
 */

import { useState } from 'react'
import { Panel } from '@xyflow/react'
import { cn } from '@/lib/utils'
import {
  GitMerge,
  Zap,
  AlertTriangle,
  Link,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export interface RelationshipFilters {
  dependencies: boolean
  enablements: boolean
  conflicts: boolean
  related: boolean
  all: boolean
}

export interface RelationshipTogglePanelProps {
  filters: RelationshipFilters
  onFiltersChange: (filters: RelationshipFilters) => void
  className?: string
}

interface FilterConfig {
  key: keyof RelationshipFilters
  label: string
  icon: typeof GitMerge
  color: string
  bgColor: string
  borderColor: string
  description: string
  linkTypes: string[]
}

const filterConfigs: FilterConfig[] = [
  {
    key: 'dependencies',
    label: 'Dependencies',
    icon: GitMerge,
    color: 'text-red-700',
    bgColor: 'bg-red-50 hover:bg-red-100',
    borderColor: 'border-red-500',
    description: 'Blocks, Depends On',
    linkTypes: ['blocks', 'depends_on'],
  },
  {
    key: 'enablements',
    label: 'Enablements',
    icon: Zap,
    color: 'text-green-700',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-500',
    description: 'Enables, Complements',
    linkTypes: ['enables', 'complements'],
  },
  {
    key: 'conflicts',
    label: 'Conflicts',
    icon: AlertTriangle,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    borderColor: 'border-amber-500',
    description: 'Conflicts, Duplicates, Supersedes',
    linkTypes: ['conflicts', 'duplicates', 'supersedes'],
  },
  {
    key: 'related',
    label: 'Related',
    icon: Link,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-500',
    description: 'General relationships',
    linkTypes: ['relates_to'],
  },
  {
    key: 'all',
    label: 'All',
    icon: Maximize2,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
    borderColor: 'border-gray-500',
    description: 'Show all relationships',
    linkTypes: [],
  },
]

export function RelationshipTogglePanel({
  filters,
  onFiltersChange,
  className,
}: RelationshipTogglePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Count active filters
  const activeCount = Object.entries(filters).filter(([_, value]) => value).length

  const handleToggle = (key: keyof RelationshipFilters) => {
    const newFilters = { ...filters }

    // If clicking "All", toggle all filters
    if (key === 'all') {
      const newValue = !filters.all
      Object.keys(newFilters).forEach((k) => {
        newFilters[k as keyof RelationshipFilters] = newValue
      })
    } else {
      // Toggle individual filter
      newFilters[key] = !newFilters[key]

      // If all individual filters are enabled, enable "All"
      const allIndividualEnabled =
        newFilters.dependencies &&
        newFilters.enablements &&
        newFilters.conflicts &&
        newFilters.related

      if (allIndividualEnabled) {
        newFilters.all = true
      } else {
        newFilters.all = false
      }
    }

    onFiltersChange(newFilters)
  }

  return (
    <Panel
      position="top-left"
      className={cn(
        'bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border transition-all duration-200',
        isCollapsed ? 'w-auto' : 'w-80',
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-gray-600" />
          <span className="font-semibold text-sm text-gray-900">Relationships</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              {activeCount}
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-2">
          {filterConfigs.map((config) => {
            const Icon = config.icon
            const isActive = filters[config.key]

            return (
              <button
                key={config.key}
                onClick={() => handleToggle(config.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md border-2 transition-all duration-150',
                  isActive
                    ? `${config.bgColor} ${config.borderColor} shadow-sm`
                    : 'bg-white border-gray-200 hover:border-gray-300',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded',
                    isActive ? config.bgColor : 'bg-gray-100'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? config.color : 'text-gray-400')} />
                </div>

                <div className="flex-1 text-left">
                  <div className={cn('font-medium text-sm', isActive ? config.color : 'text-gray-700')}>
                    {config.label}
                  </div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>

                {/* Checkbox */}
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    isActive ? `${config.borderColor} ${config.bgColor}` : 'border-gray-300 bg-white'
                  )}
                >
                  {isActive && (
                    <svg
                      className={cn('w-3 h-3', config.color)}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}

          {/* Help Text */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 leading-relaxed">
              Toggle relationship types to filter visible connections on the canvas. Click &quot;All&quot; to
              show or hide all relationships at once.
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}

/**
 * Helper function to filter edges based on active relationship filters
 *
 * @param edges - All edges in the graph
 * @param filters - Active relationship filters
 * @returns Filtered edges
 */
interface EdgeWithData {
  id: string
  source?: string
  target?: string
  data?: { linkType?: string }
  label?: unknown // ReactNode can be string, number, null, or React element
}

export function filterEdgesByRelationships<T extends EdgeWithData>(edges: T[], filters: RelationshipFilters): T[] {
  // If all filters are active or no filters are active, show all edges
  if (filters.all) {
    return edges
  }

  // If no filters are active, hide all edges
  if (!filters.dependencies && !filters.enablements && !filters.conflicts && !filters.related) {
    return []
  }

  // Filter edges based on active filters
  const activeFilterConfigs = filterConfigs.filter((config) => filters[config.key])
  const activeLinkTypes = new Set(
    activeFilterConfigs.flatMap((config) => config.linkTypes)
  )

  return edges.filter((edge) => {
    const labelStr = typeof edge.label === 'string' ? edge.label : ''
    const linkType = edge.data?.linkType || labelStr.toLowerCase().replace(' ', '_') || 'relates_to'
    return activeLinkTypes.has(linkType)
  })
}
