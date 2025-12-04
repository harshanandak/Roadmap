/**
 * Creation Tools for Agentic AI Mode
 *
 * Tools that create new entities in the system:
 * - createWorkItem: Create features, bugs, enhancements
 * - createTask: Create tasks under work items
 * - createDependency: Link two work items
 * - createTimelineItem: Add timeline breakdown (Day 2)
 * - createInsight: Create customer insight (Day 2)
 *
 * All creation tools:
 * - Require user approval before execution
 * - Are reversible (support rollback)
 * - Return preview data for the approval workflow
 *
 * Pattern:
 * 1. Tool returns preview (no DB changes)
 * 2. User reviews and approves/rejects
 * 3. Agent Executor performs actual DB operation
 */

import { tool } from 'ai'
import { z } from 'zod'
import { toolRegistry, TOOL_CATEGORIES } from './tool-registry'
import {
  CreateWorkItemParamsSchema,
  CreateTaskParamsSchema,
  CreateDependencyParamsSchema,
  CreateTimelineItemParamsSchema,
  CreateInsightParamsSchema,
} from '../schemas/agentic-schemas'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format Zod validation errors into human-readable messages
 *
 * Compatible with Zod v4 which uses simplified issue types.
 */
function formatZodErrors(error: z.ZodError<unknown>): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'input'

    // Handle missing required fields
    if (issue.message.toLowerCase().includes('required')) {
      return `Missing required field: "${path}"`
    }

    // Handle type errors with better formatting
    if (issue.message.toLowerCase().includes('expected')) {
      return `"${path}": ${issue.message}`
    }

    // Default: use the message with path context
    if (path !== 'input') {
      return `"${path}": ${issue.message}`
    }
    return issue.message
  })
}

/**
 * Create a standardized error response for validation failures
 *
 * Returns a user-friendly error instead of throwing, allowing
 * the AI to explain the issue to users.
 */
function createValidationErrorResponse(
  error: z.ZodError,
  toolCallId: string
): {
  requiresApproval: false
  error: string
  validationErrors: string[]
  toolCallId: string
} {
  const errors = formatZodErrors(error)
  return {
    requiresApproval: false,
    error: `Validation failed: ${errors[0]}`,
    validationErrors: errors,
    toolCallId,
  }
}

/**
 * Create a standardized preview response for approval workflow
 */
function createPreviewResponse(options: {
  action: 'create' | 'update' | 'delete'
  entityType: string
  data: Record<string, unknown>
  description: string
  affectedItems?: Array<{ id: string; type: string; name?: string; change: 'create' | 'update' | 'delete' }>
  warnings?: string[]
  toolCallId: string
}): {
  requiresApproval: boolean
  preview: {
    action: 'create' | 'update' | 'delete'
    entityType: string
    data: Record<string, unknown>
    description: string
    affectedItems: Array<{ id: string; type: string; name?: string; change: 'create' | 'update' | 'delete' }>
    warnings: string[]
  }
  toolCallId: string
} {
  return {
    requiresApproval: true,
    preview: {
      action: options.action,
      entityType: options.entityType,
      data: options.data,
      description: options.description,
      affectedItems: options.affectedItems || [],
      warnings: options.warnings || [],
    },
    toolCallId: options.toolCallId,
  }
}

// =============================================================================
// CREATE WORK ITEM TOOL
// =============================================================================

/**
 * Create a new work item (feature, bug, concept, or enhancement)
 *
 * This is one of the most frequently used creation tools.
 * All work items require approval before being added to the database.
 */
export const createWorkItemTool = toolRegistry.register(
  tool({
    description:
      'Create a new work item in the workspace. Work items can be concepts (ideas), features, bugs, or enhancements. Returns a preview for user approval before creation.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID where the work item will be created'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      name: z
        .string()
        .min(3)
        .max(100)
        .describe('Work item name (3-100 characters). Be descriptive but concise.'),
      type: z
        .enum(['concept', 'feature', 'bug', 'enhancement'])
        .describe('Type of work item: concept (idea), feature, bug, or enhancement'),
      purpose: z
        .string()
        .max(500)
        .optional()
        .describe('Purpose or description explaining why this work item matters'),
      priority: z
        .enum(['critical', 'high', 'medium', 'low'])
        .optional()
        .describe('Priority level. Critical for urgent issues, high for important features.'),
      tags: z
        .array(z.string())
        .max(5)
        .optional()
        .describe('Tags for categorization (max 5)'),
      phase: z
        .enum(['research', 'planning', 'development', 'testing', 'complete'])
        .optional()
        .describe('Initial phase for the work item'),
    }),
    execute: async (params, { toolCallId }) => {
      // Validate with Zod schema - use safeParse for graceful error handling
      const result = CreateWorkItemParamsSchema.safeParse(params)
      if (!result.success) {
        return createValidationErrorResponse(result.error, toolCallId)
      }
      const validated = result.data

      return createPreviewResponse({
        action: 'create',
        entityType: 'work_item',
        data: validated,
        description: `Create ${validated.type}: "${validated.name}"`,
        affectedItems: [
          {
            id: 'new',
            type: 'work_item',
            name: validated.name,
            change: 'create',
          },
        ],
        warnings:
          validated.priority === 'critical'
            ? ['Critical priority items will appear at the top of the backlog']
            : [],
        toolCallId,
      })
    },
  }),
  {
    name: 'createWorkItem',
    displayName: 'Create Work Item',
    description: 'Create a new concept, feature, bug, or enhancement in the workspace',
    category: TOOL_CATEGORIES.CREATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'create',
    estimatedDuration: 'fast',
    targetEntity: 'work_item',
    keywords: ['create', 'add', 'new', 'feature', 'bug', 'enhancement', 'concept', 'idea'],
    inputExamples: [
      {
        description: 'User wants to add a new feature for dark mode',
        userMessage: 'Add a feature for dark mode support in the application',
        input: {
          name: 'Dark Mode Support',
          type: 'feature',
          purpose: 'Allow users to switch to a dark color theme for reduced eye strain',
          priority: 'medium',
          tags: ['ui', 'theme', 'accessibility'],
        },
      },
      {
        description: 'User reports a critical authentication bug',
        userMessage: 'There is a bug where users get logged out randomly, this is urgent',
        input: {
          name: 'Random Session Logout Bug',
          type: 'bug',
          purpose: 'Users experience unexpected logouts during normal usage, affecting productivity',
          priority: 'critical',
          tags: ['auth', 'session', 'urgent'],
        },
      },
      {
        description: 'User has an early-stage idea to explore',
        userMessage: 'I have an idea - what if we added AI-powered search?',
        input: {
          name: 'AI-Powered Search',
          type: 'concept',
          purpose: 'Explore using AI/ML to improve search relevance and suggestions',
          priority: 'low',
          tags: ['ai', 'search', 'exploration'],
          phase: 'research',
        },
      },
    ],
  }
)

// =============================================================================
// CREATE TASK TOOL
// =============================================================================

/**
 * Create a task under a work item
 *
 * Tasks are execution-level items that represent specific pieces of work
 * needed to complete a work item (feature, bug, etc.)
 */
export const createTaskTool = toolRegistry.register(
  tool({
    description:
      'Create a task under an existing work item. Tasks represent specific executable work needed to complete the parent work item. Returns a preview for user approval.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      workItemId: z.string().describe('ID of the parent work item this task belongs to'),
      name: z
        .string()
        .min(3)
        .max(100)
        .describe('Task name (3-100 characters). Should be actionable.'),
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Detailed description of what needs to be done'),
      priority: z
        .enum(['critical', 'high', 'medium', 'low'])
        .optional()
        .describe('Task priority level'),
      assigneeId: z
        .string()
        .optional()
        .describe('User ID to assign this task to (optional)'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date in ISO format (e.g., 2025-12-31)'),
    }),
    execute: async (params, { toolCallId }) => {
      const result = CreateTaskParamsSchema.safeParse(params)
      if (!result.success) {
        return createValidationErrorResponse(result.error, toolCallId)
      }
      const validated = result.data

      return createPreviewResponse({
        action: 'create',
        entityType: 'product_task',
        data: validated,
        description: `Create task: "${validated.name}" under work item ${validated.workItemId}`,
        affectedItems: [
          {
            id: 'new',
            type: 'product_task',
            name: validated.name,
            change: 'create',
          },
          {
            id: validated.workItemId,
            type: 'work_item',
            change: 'update', // Parent task count changes
          },
        ],
        warnings: validated.dueDate
          ? [`Due date set to ${validated.dueDate}`]
          : [],
        toolCallId,
      })
    },
  }),
  {
    name: 'createTask',
    displayName: 'Create Task',
    description: 'Create a task under an existing work item',
    category: TOOL_CATEGORIES.CREATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'create',
    estimatedDuration: 'fast',
    targetEntity: 'product_task',
    keywords: ['create', 'add', 'new', 'task', 'todo', 'action', 'work'],
    inputExamples: [
      {
        description: 'User wants to break down a feature into implementation tasks',
        userMessage: 'Add a task to implement the login API endpoint for the auth feature',
        input: {
          workItemId: '{{currentWorkItemId}}',
          name: 'Implement login API endpoint',
          description: 'Create POST /api/auth/login endpoint with JWT token generation',
          priority: 'high',
        },
      },
      {
        description: 'User wants to assign a task with a deadline',
        userMessage: 'Create a task to write unit tests, assign to John, due next Friday',
        input: {
          workItemId: '{{currentWorkItemId}}',
          name: 'Write unit tests for login flow',
          description: 'Cover success, failure, and edge cases for authentication',
          priority: 'medium',
          assigneeId: '{{johnUserId}}',
          dueDate: '2025-12-13',
        },
      },
      {
        description: 'User wants to add a documentation task',
        userMessage: 'Add a task to update the API documentation',
        input: {
          workItemId: '{{currentWorkItemId}}',
          name: 'Update API documentation',
          description: 'Document new endpoints, request/response formats, and examples',
          priority: 'low',
        },
      },
    ],
  }
)

// =============================================================================
// CREATE DEPENDENCY TOOL
// =============================================================================

/**
 * Create a dependency relationship between two work items
 *
 * Dependencies help track which work items must be completed before others,
 * or which items complement/relate to each other.
 */
export const createDependencyTool = toolRegistry.register(
  tool({
    description:
      'Create a dependency or relationship between two work items. Can specify dependency types: blocks (A must finish before B), depends_on, complements (work better together), or relates_to.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      sourceId: z
        .string()
        .describe('Source work item ID (the item that has the dependency)'),
      targetId: z
        .string()
        .describe('Target work item ID (the item being depended on or related to)'),
      connectionType: z
        .enum(['dependency', 'blocks', 'complements', 'relates_to'])
        .describe(
          'Type of relationship: dependency (source depends on target), blocks (source blocks target), complements (work better together), relates_to (general relation)'
        ),
      reason: z
        .string()
        .max(300)
        .optional()
        .describe('Explanation of why this dependency exists'),
      strength: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Dependency strength (0-1), higher means stronger relationship'),
    }),
    execute: async (params, { toolCallId }) => {
      const result = CreateDependencyParamsSchema.safeParse(params)
      if (!result.success) {
        return createValidationErrorResponse(result.error, toolCallId)
      }
      const validated = result.data

      // Prevent self-referencing dependency
      if (validated.sourceId === validated.targetId) {
        return {
          requiresApproval: false,
          error: 'Cannot create a dependency from a work item to itself',
          toolCallId,
        }
      }

      const connectionDescription = {
        dependency: `"${validated.sourceId}" depends on "${validated.targetId}"`,
        blocks: `"${validated.sourceId}" blocks "${validated.targetId}"`,
        complements: `"${validated.sourceId}" complements "${validated.targetId}"`,
        relates_to: `"${validated.sourceId}" relates to "${validated.targetId}"`,
      }[validated.connectionType]

      return createPreviewResponse({
        action: 'create',
        entityType: 'linked_item',
        data: validated,
        description: `Create ${validated.connectionType} link: ${connectionDescription}`,
        affectedItems: [
          {
            id: validated.sourceId,
            type: 'work_item',
            change: 'update',
          },
          {
            id: validated.targetId,
            type: 'work_item',
            change: 'update',
          },
        ],
        warnings:
          validated.connectionType === 'blocks'
            ? ['Blocking dependencies may affect timeline scheduling']
            : [],
        toolCallId,
      })
    },
  }),
  {
    name: 'createDependency',
    displayName: 'Create Dependency',
    description: 'Link two work items with a dependency or relationship',
    category: TOOL_CATEGORIES.CREATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'create',
    estimatedDuration: 'fast',
    targetEntity: 'linked_item',
    keywords: ['create', 'add', 'link', 'dependency', 'depends', 'blocks', 'relates', 'connection'],
    inputExamples: [
      {
        description: 'User indicates one feature blocks another',
        userMessage: 'The auth feature blocks the dashboard feature - we need auth first',
        input: {
          sourceId: '{{authFeatureId}}',
          targetId: '{{dashboardFeatureId}}',
          connectionType: 'blocks',
          reason: 'Dashboard requires authenticated user context to display data',
          strength: 0.9,
        },
      },
      {
        description: 'User indicates features work well together',
        userMessage: 'Dark mode and the accessibility feature complement each other',
        input: {
          sourceId: '{{darkModeId}}',
          targetId: '{{accessibilityId}}',
          connectionType: 'complements',
          reason: 'Both improve user experience for visual preferences',
          strength: 0.7,
        },
      },
      {
        description: 'User wants to note a general relationship',
        userMessage: 'The mobile app feature is related to the responsive design bug',
        input: {
          sourceId: '{{mobileAppId}}',
          targetId: '{{responsiveBugId}}',
          connectionType: 'relates_to',
          reason: 'Fixing the responsive bug will benefit mobile app development',
        },
      },
    ],
  }
)

// =============================================================================
// CREATE TIMELINE ITEM TOOL
// =============================================================================

/**
 * Create a timeline item (MVP, SHORT, LONG breakdown) under a work item
 *
 * Timeline items help break down work items into time-based priorities:
 * - MVP: Must have for initial release
 * - SHORT: Short-term improvements (1-3 months)
 * - LONG: Long-term goals (3+ months)
 */
export const createTimelineItemTool = toolRegistry.register(
  tool({
    description:
      'Create a timeline breakdown item under an existing work item. Timeline items categorize work into MVP (must have), SHORT (1-3 months), or LONG (3+ months) timeframes.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      workItemId: z.string().describe('ID of the parent work item'),
      name: z
        .string()
        .min(3)
        .max(100)
        .describe('Timeline item name (3-100 characters). Be specific about the deliverable.'),
      timeframe: z
        .enum(['mvp', 'short', 'long'])
        .describe('Timeline category: mvp (must-have for launch), short (1-3 months), long (3+ months)'),
      description: z
        .string()
        .max(500)
        .optional()
        .describe('Detailed description of this timeline item'),
      priority: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Priority score 1-100 (higher = more important). Default: 50'),
    }),
    execute: async (params, { toolCallId }) => {
      const result = CreateTimelineItemParamsSchema.safeParse(params)
      if (!result.success) {
        return createValidationErrorResponse(result.error, toolCallId)
      }
      const validated = result.data

      const timeframeLabels = {
        mvp: 'MVP (Must Have)',
        short: 'Short-term (1-3 months)',
        long: 'Long-term (3+ months)',
      }

      return createPreviewResponse({
        action: 'create',
        entityType: 'timeline_item',
        data: validated,
        description: `Create ${timeframeLabels[validated.timeframe]} item: "${validated.name}"`,
        affectedItems: [
          {
            id: 'new',
            type: 'timeline_item',
            name: validated.name,
            change: 'create',
          },
          {
            id: validated.workItemId,
            type: 'work_item',
            change: 'update', // Parent timeline count changes
          },
        ],
        warnings:
          validated.timeframe === 'mvp'
            ? ['MVP items are critical for launch - ensure this is truly essential']
            : [],
        toolCallId,
      })
    },
  }),
  {
    name: 'createTimelineItem',
    displayName: 'Create Timeline Item',
    description: 'Create a timeline breakdown (MVP/Short/Long) under a work item',
    category: TOOL_CATEGORIES.CREATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'create',
    estimatedDuration: 'fast',
    targetEntity: 'timeline_item',
    keywords: ['create', 'add', 'timeline', 'mvp', 'short-term', 'long-term', 'breakdown', 'roadmap'],
    inputExamples: [
      {
        description: 'User wants to mark something as essential for launch',
        userMessage: 'Basic login is MVP for the auth feature',
        input: {
          workItemId: '{{currentWorkItemId}}',
          name: 'Basic email/password login',
          timeframe: 'mvp',
          description: 'Core authentication with email and password, essential for launch',
          priority: 95,
        },
      },
      {
        description: 'User wants to plan a near-term enhancement',
        userMessage: 'Add social login in the next 2 months',
        input: {
          workItemId: '{{currentWorkItemId}}',
          name: 'Social login (Google, GitHub)',
          timeframe: 'short',
          description: 'OAuth integration with popular providers for easier signup',
          priority: 60,
        },
      },
      {
        description: 'User wants to plan a future enhancement',
        userMessage: 'Add biometric login as a long-term goal',
        input: {
          workItemId: '{{currentWorkItemId}}',
          name: 'Biometric authentication (Face ID, Touch ID)',
          timeframe: 'long',
          description: 'Native mobile biometric support for enhanced security',
          priority: 30,
        },
      },
    ],
  }
)

// =============================================================================
// CREATE INSIGHT TOOL
// =============================================================================

/**
 * Create a customer insight or feedback record
 *
 * Insights capture customer feedback, research findings, and market observations
 * that can be linked to work items for context-driven development.
 */
export const createInsightTool = toolRegistry.register(
  tool({
    description:
      'Create a customer insight or feedback record. Insights capture user feedback, research findings, or market observations that inform product decisions.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      title: z
        .string()
        .min(3)
        .max(100)
        .describe('Insight title (3-100 characters). Summarize the key finding.'),
      content: z
        .string()
        .min(10)
        .max(2000)
        .describe('Detailed insight content (10-2000 characters). Include quotes, data, or observations.'),
      source: z
        .string()
        .max(200)
        .optional()
        .describe('Source of the insight (e.g., "User Interview - Dec 2024", "App Store Review")'),
      sentiment: z
        .enum(['positive', 'neutral', 'negative'])
        .optional()
        .describe('Overall sentiment of the insight'),
      tags: z
        .array(z.string())
        .max(5)
        .optional()
        .describe('Tags for categorization (max 5)'),
      linkedWorkItemId: z
        .string()
        .optional()
        .describe('ID of a related work item to link this insight to'),
    }),
    execute: async (params, { toolCallId }) => {
      const result = CreateInsightParamsSchema.safeParse(params)
      if (!result.success) {
        return createValidationErrorResponse(result.error, toolCallId)
      }
      const validated = result.data

      const sentimentLabel = validated.sentiment
        ? { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' }[
            validated.sentiment
          ]
        : 'Unknown'

      const affectedItems: Array<{ id: string; type: string; name?: string; change: 'create' | 'update' | 'delete' }> = [
        {
          id: 'new',
          type: 'insight',
          name: validated.title,
          change: 'create',
        },
      ]

      // If linked to a work item, include it in affected items
      if (validated.linkedWorkItemId) {
        affectedItems.push({
          id: validated.linkedWorkItemId,
          type: 'work_item',
          change: 'update',
        })
      }

      return createPreviewResponse({
        action: 'create',
        entityType: 'insight',
        data: validated,
        description: `Create ${sentimentLabel} insight: "${validated.title}"`,
        affectedItems,
        warnings:
          validated.sentiment === 'negative'
            ? ['Negative feedback often highlights critical improvement opportunities']
            : [],
        toolCallId,
      })
    },
  }),
  {
    name: 'createInsight',
    displayName: 'Create Customer Insight',
    description: 'Create a customer insight or feedback record',
    category: TOOL_CATEGORIES.CREATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'create',
    estimatedDuration: 'fast',
    targetEntity: 'insight',
    keywords: ['create', 'add', 'insight', 'feedback', 'customer', 'research', 'observation', 'review'],
    inputExamples: [
      {
        description: 'User captures positive feedback from an interview',
        userMessage: 'User loved the onboarding flow, said it was intuitive',
        input: {
          title: 'Positive onboarding experience feedback',
          content: 'User mentioned: "The onboarding was really smooth, I knew exactly what to do at each step." They particularly liked the progress indicator.',
          source: 'User Interview - Dec 2024',
          sentiment: 'positive',
          tags: ['onboarding', 'ux', 'user-interview'],
        },
      },
      {
        description: 'User captures negative feedback from app review',
        userMessage: 'Got a complaint about slow loading times in the app store',
        input: {
          title: 'App performance complaint - slow loading',
          content: 'App Store review states: "App takes forever to load, especially the dashboard. Makes it unusable on mobile data." Rating: 2 stars.',
          source: 'App Store Review',
          sentiment: 'negative',
          tags: ['performance', 'mobile', 'app-store'],
          linkedWorkItemId: '{{performanceBugId}}',
        },
      },
      {
        description: 'User captures market research finding',
        userMessage: 'Competitor X just launched a feature for collaborative editing',
        input: {
          title: 'Competitor X launches real-time collaboration',
          content: 'Competitor X announced real-time collaborative editing feature. Key differentiators: cursor presence, comments, @mentions. Pricing unchanged.',
          source: 'Competitor Analysis - Q4 2024',
          sentiment: 'neutral',
          tags: ['competitive', 'collaboration', 'research'],
        },
      },
    ],
  }
)

// =============================================================================
// BUNDLED CREATION TOOLS (All 5)
// =============================================================================

/**
 * All creation tools (5 total)
 *
 * These tools handle creating new entities in the system:
 * - Work items (features, bugs, enhancements, concepts)
 * - Tasks under work items
 * - Dependencies between work items
 * - Timeline breakdowns (MVP/Short/Long)
 * - Customer insights and feedback
 */
export const creationTools = {
  createWorkItem: createWorkItemTool,
  createTask: createTaskTool,
  createDependency: createDependencyTool,
  createTimelineItem: createTimelineItemTool,
  createInsight: createInsightTool,
}

/**
 * Array of tool names for iteration
 */
export const creationToolNames = Object.keys(creationTools) as Array<keyof typeof creationTools>

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreationToolName = keyof typeof creationTools
