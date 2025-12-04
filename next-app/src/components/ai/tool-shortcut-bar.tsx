'use client'

/**
 * ToolShortcutBar Component
 *
 * Provides hoverable category buttons above the chat input:
 * [Create] [Analyze] [Optimize] [Strategy]
 *
 * Hovering on a category shows a dropdown with tool options.
 * Clicking a tool inserts a prompt template into the chat input.
 *
 * This enables a chat-first experience where users can either:
 * 1. Type freely and let AI figure out what to do
 * 2. Use shortcuts to quickly invoke specific tools
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Plus,
  Search,
  Zap,
  Target,
  FileText,
  CheckSquare,
  Link2,
  Calendar,
  Lightbulb,
  MessageSquare,
  GitBranch,
  AlertTriangle,
  ListOrdered,
  Users,
  Clock,
  Copy,
  Compass,
  BarChart3,
  TrendingUp,
  Map,
} from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface ToolShortcut {
  name: string
  displayName: string
  icon: React.ComponentType<{ className?: string }>
  promptTemplate: string
  description: string
}

export interface ToolCategory {
  name: string
  displayName: string
  icon: React.ComponentType<{ className?: string }>
  tools: ToolShortcut[]
  color: string
}

// =============================================================================
// TOOL DEFINITIONS BY CATEGORY
// =============================================================================

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: 'creation',
    displayName: 'Create',
    icon: Plus,
    color: 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200',
    tools: [
      {
        name: 'createWorkItem',
        displayName: 'Create Work Item',
        icon: FileText,
        promptTemplate: 'Create a work item: ',
        description: 'Create a new feature, bug, concept, or enhancement',
      },
      {
        name: 'createTask',
        displayName: 'Create Task',
        icon: CheckSquare,
        promptTemplate: 'Create a task: ',
        description: 'Add a task under an existing work item',
      },
      {
        name: 'createDependency',
        displayName: 'Create Dependency',
        icon: Link2,
        promptTemplate: 'Create a dependency between: ',
        description: 'Link two work items with a relationship',
      },
      {
        name: 'createTimelineItem',
        displayName: 'Create Timeline Item',
        icon: Calendar,
        promptTemplate: 'Create a timeline item: ',
        description: 'Add MVP/Short/Long breakdown to a work item',
      },
      {
        name: 'createInsight',
        displayName: 'Create Insight',
        icon: Lightbulb,
        promptTemplate: 'Create an insight: ',
        description: 'Record customer feedback or research finding',
      },
    ],
  },
  {
    name: 'analysis',
    displayName: 'Analyze',
    icon: Search,
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
    tools: [
      {
        name: 'analyzeFeedback',
        displayName: 'Analyze Feedback',
        icon: MessageSquare,
        promptTemplate: 'Analyze feedback: ',
        description: 'Sentiment analysis and theme extraction',
      },
      {
        name: 'suggestDependencies',
        displayName: 'Suggest Dependencies',
        icon: GitBranch,
        promptTemplate: 'Suggest dependencies for: ',
        description: 'Find missing links between work items',
      },
      {
        name: 'findGaps',
        displayName: 'Find Gaps',
        icon: AlertTriangle,
        promptTemplate: 'Find gaps in: ',
        description: 'Identify missing timelines, tasks, or descriptions',
      },
      {
        name: 'summarizeWorkItem',
        displayName: 'Summarize Item',
        icon: FileText,
        promptTemplate: 'Summarize: ',
        description: 'Generate AI summary of a work item',
      },
      {
        name: 'extractRequirements',
        displayName: 'Extract Requirements',
        icon: ListOrdered,
        promptTemplate: 'Extract requirements from: ',
        description: 'Parse requirements from text or notes',
      },
    ],
  },
  {
    name: 'optimization',
    displayName: 'Optimize',
    icon: Zap,
    color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200',
    tools: [
      {
        name: 'prioritizeFeatures',
        displayName: 'Prioritize Features',
        icon: ListOrdered,
        promptTemplate: 'Prioritize features: ',
        description: 'Apply RICE/WSJF scoring to rank features',
      },
      {
        name: 'balanceWorkload',
        displayName: 'Balance Workload',
        icon: Users,
        promptTemplate: 'Balance workload: ',
        description: 'Redistribute tasks across team members',
      },
      {
        name: 'identifyRisks',
        displayName: 'Identify Risks',
        icon: AlertTriangle,
        promptTemplate: 'Identify risks: ',
        description: 'Flag stale, blocked, or at-risk items',
      },
      {
        name: 'suggestTimeline',
        displayName: 'Suggest Timeline',
        icon: Clock,
        promptTemplate: 'Suggest timeline: ',
        description: 'Estimate dates and milestones',
      },
      {
        name: 'deduplicateItems',
        displayName: 'Find Duplicates',
        icon: Copy,
        promptTemplate: 'Find duplicates: ',
        description: 'Identify and merge duplicate items',
      },
    ],
  },
  {
    name: 'strategy',
    displayName: 'Strategy',
    icon: Target,
    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200',
    tools: [
      {
        name: 'alignToStrategy',
        displayName: 'Align to Strategy',
        icon: Compass,
        promptTemplate: 'Align to strategy: ',
        description: 'Suggest work item to strategy alignments',
      },
      {
        name: 'suggestOKRs',
        displayName: 'Suggest OKRs',
        icon: Target,
        promptTemplate: 'Suggest OKRs: ',
        description: 'Generate OKRs based on workspace context',
      },
      {
        name: 'competitiveAnalysis',
        displayName: 'Competitive Analysis',
        icon: BarChart3,
        promptTemplate: 'Analyze competitors: ',
        description: 'Research and compare competitors',
      },
      {
        name: 'roadmapGenerator',
        displayName: 'Generate Roadmap',
        icon: Map,
        promptTemplate: 'Generate roadmap: ',
        description: 'Create visual roadmap from work items',
      },
      {
        name: 'impactAssessment',
        displayName: 'Assess Impact',
        icon: TrendingUp,
        promptTemplate: 'Assess impact: ',
        description: 'Predict business impact of features',
      },
    ],
  },
]

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface ToolShortcutBarProps {
  onInsertPrompt: (prompt: string) => void
  disabled?: boolean
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ToolShortcutBar({
  onInsertPrompt,
  disabled = false,
  className,
}: ToolShortcutBarProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const handleCategoryEnter = useCallback((categoryName: string) => {
    if (!disabled) {
      setActiveCategory(categoryName)
    }
  }, [disabled])

  const handleCategoryLeave = useCallback(() => {
    setActiveCategory(null)
  }, [])

  const handleToolClick = useCallback(
    (tool: ToolShortcut) => {
      if (!disabled) {
        onInsertPrompt(tool.promptTemplate)
        setActiveCategory(null)
      }
    },
    [disabled, onInsertPrompt]
  )

  return (
    <div className={cn('relative flex items-center gap-1', className)}>
      {TOOL_CATEGORIES.map((category) => (
        <div
          key={category.name}
          className="relative"
          onMouseEnter={() => handleCategoryEnter(category.name)}
          onMouseLeave={handleCategoryLeave}
        >
          {/* Category Button */}
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              category.color
            )}
          >
            <category.icon className="h-4 w-4" />
            <span>{category.displayName}</span>
          </button>

          {/* Dropdown */}
          {activeCategory === category.name && (
            <div
              className={cn(
                'absolute left-0 top-full z-50 mt-1 w-64',
                'bg-white rounded-lg shadow-lg border border-gray-200',
                'animate-in fade-in-0 zoom-in-95 duration-150'
              )}
              onMouseEnter={() => handleCategoryEnter(category.name)}
              onMouseLeave={handleCategoryLeave}
            >
              <div className="p-1">
                {category.tools.map((tool) => (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => handleToolClick(tool)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2 rounded-md text-left',
                      'hover:bg-gray-50 transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
                    )}
                  >
                    <tool.icon className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {tool.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {tool.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export { TOOL_CATEGORIES }
export default ToolShortcutBar
