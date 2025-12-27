/**
 * Optimization Tools for Agentic AI Mode
 *
 * Tools that optimize and improve existing data:
 * - prioritizeFeatures: Apply RICE/WSJF scoring to rank features
 * - balanceWorkload: Redistribute tasks across team members
 * - identifyRisks: Flag at-risk items based on patterns
 * - suggestTimeline: Estimate dates and milestones
 * - deduplicateItems: Find and suggest merging duplicate items
 *
 * Optimization tools follow mixed patterns:
 * - Some require approval (actual changes): prioritizeFeatures, balanceWorkload, deduplicateItems
 * - Some are analysis-only (no changes): identifyRisks, suggestTimeline
 *
 * Reversible tools store previous state for undo support.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { toolRegistry, TOOL_CATEGORIES } from './tool-registry'

// =============================================================================
// HELPER TYPES
// =============================================================================

interface OptimizationPreview {
  action: 'update' | 'suggest'
  entityType: string
  description: string
  changes: Array<{
    id: string
    type: string
    name?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    change: 'update' | 'merge' | 'reassign'
  }>
  impact: {
    itemsAffected: number
    estimatedBenefit: string
  }
  warnings: string[]
}

function createOptimizationPreview(options: {
  action: 'update' | 'suggest'
  entityType: string
  description: string
  changes: OptimizationPreview['changes']
  itemsAffected: number
  estimatedBenefit: string
  warnings?: string[]
  toolCallId: string
}): {
  requiresApproval: boolean
  preview: OptimizationPreview
  toolCallId: string
} {
  return {
    requiresApproval: options.action === 'update',
    preview: {
      action: options.action,
      entityType: options.entityType,
      description: options.description,
      changes: options.changes,
      impact: {
        itemsAffected: options.itemsAffected,
        estimatedBenefit: options.estimatedBenefit,
      },
      warnings: options.warnings || [],
    },
    toolCallId: options.toolCallId,
  }
}

// =============================================================================
// PRIORITIZE FEATURES TOOL
// =============================================================================

/**
 * Apply prioritization scoring (RICE/WSJF) to rank features
 *
 * RICE = (Reach x Impact x Confidence) / Effort
 * WSJF = (User Value + Time Value + Risk Reduction) / Job Size
 *
 * Requires approval since it updates priority fields.
 */
export const prioritizeFeaturesTool = toolRegistry.register(
  tool({
    description:
      'Apply prioritization framework (RICE or WSJF) to rank and score work items. Updates priority fields based on calculated scores. Helps ensure the team works on highest-value items first.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      framework: z
        .enum(['rice', 'wsjf', 'auto'])
        .describe('Prioritization framework: rice, wsjf, or auto (AI chooses best fit)'),
      workItemIds: z
        .array(z.string())
        .optional()
        .describe('Specific work items to prioritize (default: all in planning/development)'),
      factors: z
        .object({
          reach: z.number().min(0).max(100).optional().describe('RICE: How many users affected'),
          impact: z.number().min(0).max(3).optional().describe('RICE: Impact level (0.25, 0.5, 1, 2, 3)'),
          confidence: z.number().min(0).max(100).optional().describe('RICE: Confidence percentage'),
          effort: z.number().min(1).max(100).optional().describe('RICE: Person-weeks'),
        })
        .optional()
        .describe('Pre-filled factors for AI to use as baseline'),
      applyChanges: z
        .boolean()
        .optional()
        .describe('If true, returns preview for approval. If false, returns analysis only.'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId: _workspaceId,
        teamId: _teamId,
        framework,
        workItemIds,
        factors: _factors,
        applyChanges = true,
      } = params

      // In real implementation, would query work items and calculate scores
      // For now, return preview structure
      const sampleChanges = [
        {
          id: 'sample-1',
          type: 'work_item',
          name: 'Feature A',
          before: { priority: 'medium', score: undefined },
          after: { priority: 'high', score: 85 },
          change: 'update' as const,
        },
        {
          id: 'sample-2',
          type: 'work_item',
          name: 'Feature B',
          before: { priority: 'high', score: undefined },
          after: { priority: 'medium', score: 62 },
          change: 'update' as const,
        },
      ]

      return createOptimizationPreview({
        action: applyChanges ? 'update' : 'suggest',
        entityType: 'work_item',
        description: `Apply ${framework.toUpperCase()} prioritization to ${workItemIds?.length || 'all'} work items`,
        changes: sampleChanges,
        itemsAffected: workItemIds?.length || 10,
        estimatedBenefit: 'Ensures team focuses on highest-value work first',
        warnings: framework === 'auto'
          ? ['AI will select between RICE and WSJF based on available data']
          : [],
        toolCallId,
      })
    },
  }),
  {
    name: 'prioritizeFeatures',
    displayName: 'Prioritize Features',
    description: 'Apply RICE/WSJF scoring to rank and prioritize features',
    category: TOOL_CATEGORIES.OPTIMIZATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'update',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['prioritize', 'rice', 'wsjf', 'score', 'rank', 'value', 'effort'],
    inputExamples: [
      {
        description: 'User wants to rank all features using RICE framework',
        userMessage: 'Prioritize our features using RICE scoring',
        input: {
          framework: 'rice',
          applyChanges: true,
        },
      },
      {
        description: 'User wants WSJF prioritization for specific items',
        userMessage: 'Apply WSJF to the authentication and payments features',
        input: {
          framework: 'wsjf',
          workItemIds: ['auth-feature-id', 'payments-feature-id'],
          applyChanges: true,
        },
      },
      {
        description: 'User wants AI to choose the best framework',
        userMessage: 'What is the best way to prioritize our backlog?',
        input: {
          framework: 'auto',
          applyChanges: false,
        },
      },
    ],
  }
)

// =============================================================================
// BALANCE WORKLOAD TOOL
// =============================================================================

/**
 * Redistribute tasks to balance workload across team members
 *
 * Analyzes current assignments and suggests reassignments to:
 * - Even out task counts
 * - Match skills to tasks
 * - Respect capacity constraints
 */
export const balanceWorkloadTool = toolRegistry.register(
  tool({
    description:
      'Analyze and redistribute tasks to balance workload across team members. Considers capacity, skills, and current assignments to suggest optimal distribution.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      targetPhase: z
        .enum(['planning', 'development', 'testing', 'all'])
        .optional()
        .describe('Which phase tasks to balance (default: development)'),
      includeUnassigned: z
        .boolean()
        .optional()
        .describe('Include unassigned tasks in balancing (default: true)'),
      maxTasksPerPerson: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum tasks per person (default: 10)'),
      respectSkills: z
        .boolean()
        .optional()
        .describe('Try to match tasks to member skills (default: true)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId: _workspaceId,
        teamId: _teamId,
        targetPhase = 'development',
        includeUnassigned: _includeUnassigned = true,
        maxTasksPerPerson: _maxTasksPerPerson = 10,
        respectSkills = true,
      } = params

      // In real implementation, would analyze assignments and suggest changes
      const sampleChanges = [
        {
          id: 'task-1',
          type: 'product_task',
          name: 'Implement login flow',
          before: { assignee: 'user-a' },
          after: { assignee: 'user-b' },
          change: 'reassign' as const,
        },
        {
          id: 'task-2',
          type: 'product_task',
          name: 'Write unit tests',
          before: { assignee: null },
          after: { assignee: 'user-c' },
          change: 'reassign' as const,
        },
      ]

      return createOptimizationPreview({
        action: 'update',
        entityType: 'product_task',
        description: `Balance workload for ${targetPhase} phase tasks`,
        changes: sampleChanges,
        itemsAffected: 5,
        estimatedBenefit: 'More even distribution reduces bottlenecks and burnout',
        warnings: respectSkills
          ? ['Skill matching is based on past assignments']
          : ['Skill matching is disabled - assignments may not match expertise'],
        toolCallId,
      })
    },
  }),
  {
    name: 'balanceWorkload',
    displayName: 'Balance Workload',
    description: 'Redistribute tasks to balance workload across team members',
    category: TOOL_CATEGORIES.OPTIMIZATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'update',
    estimatedDuration: 'medium',
    targetEntity: 'product_task',
    keywords: ['balance', 'workload', 'assign', 'distribute', 'capacity', 'team'],
    inputExamples: [
      {
        description: 'User wants to redistribute tasks evenly',
        userMessage: 'Balance the workload across my team members',
        input: {
          targetPhase: 'development',
          includeUnassigned: true,
          respectSkills: true,
        },
      },
      {
        description: 'User has a team member who is overloaded',
        userMessage: 'John has too many tasks, redistribute some to others',
        input: {
          targetPhase: 'all',
          maxTasksPerPerson: 8,
          respectSkills: true,
        },
      },
      {
        description: 'User wants to assign all unassigned tasks',
        userMessage: 'Assign all the unassigned testing tasks to team members',
        input: {
          targetPhase: 'testing',
          includeUnassigned: true,
          maxTasksPerPerson: 10,
        },
      },
    ],
  }
)

// =============================================================================
// IDENTIFY RISKS TOOL
// =============================================================================

/**
 * Identify at-risk items based on patterns
 *
 * Analysis-only tool that flags:
 * - Stale items (no updates in X days)
 * - Blocked items (dependencies not met)
 * - Scope creep indicators
 * - Missing requirements
 */
export const identifyRisksTool = toolRegistry.register(
  tool({
    description:
      'Analyze work items to identify risks: stale items, blocked dependencies, scope creep, missing information. Returns risk assessment with severity and suggested mitigations.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      riskTypes: z
        .array(z.enum(['stale', 'blocked', 'scope_creep', 'missing_info', 'overdue']))
        .optional()
        .describe('Types of risks to check (default: all)'),
      staleDays: z
        .number()
        .min(1)
        .max(365)
        .optional()
        .describe('Days without update to consider stale (default: 14)'),
      includeCompleted: z
        .boolean()
        .optional()
        .describe('Include completed items in analysis (default: false)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        riskTypes = ['stale', 'blocked', 'scope_creep', 'missing_info', 'overdue'],
        staleDays = 14,
        includeCompleted = false,
      } = params

      // Analysis-only tool - returns findings without changes
      return {
        type: 'analysis_result' as const,
        result: {
          toolName: 'identifyRisks',
          success: true,
          summary: `Risk analysis will scan for ${riskTypes.length} risk types`,
          findings: [
            {
              id: 'risk-1',
              type: 'stale',
              title: 'Stale Item Detection',
              description: `Will flag items not updated in ${staleDays}+ days`,
              confidence: 95,
              severity: 'warning' as const,
            },
            {
              id: 'risk-2',
              type: 'blocked',
              title: 'Blocked Dependencies',
              description: 'Will identify items with unmet blocking dependencies',
              confidence: 90,
              severity: 'critical' as const,
            },
          ],
          metadata: {
            workspaceId,
            teamId,
            riskTypes,
            staleDays,
            includeCompleted,
          },
          executionTime: 0, // Placeholder
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'identifyRisks',
    displayName: 'Identify Risks',
    description: 'Flag at-risk items (stale, blocked, scope creep)',
    category: TOOL_CATEGORIES.OPTIMIZATION,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['risk', 'stale', 'blocked', 'overdue', 'scope', 'warning', 'alert'],
    inputExamples: [
      {
        description: 'User wants a full risk assessment',
        userMessage: 'What are the risks in our current project?',
        input: {
          riskTypes: ['stale', 'blocked', 'scope_creep', 'missing_info', 'overdue'],
          staleDays: 14,
        },
      },
      {
        description: 'User wants to find blocked items only',
        userMessage: 'Which features are blocked by unmet dependencies?',
        input: {
          riskTypes: ['blocked'],
        },
      },
      {
        description: 'User wants to find items with scope creep',
        userMessage: 'Are there any features experiencing scope creep?',
        input: {
          riskTypes: ['scope_creep', 'missing_info'],
          includeCompleted: false,
        },
      },
    ],
  }
)

// =============================================================================
// SUGGEST TIMELINE TOOL
// =============================================================================

/**
 * Suggest dates and milestones for work items
 *
 * Analysis-only tool that estimates:
 * - Start and end dates
 * - Milestone placements
 * - Critical path items
 * - Buffer recommendations
 */
export const suggestTimelineTool = toolRegistry.register(
  tool({
    description:
      'Analyze work items and suggest timeline estimates including start/end dates, milestones, and critical path. Uses historical data and dependencies to make predictions.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      startDate: z
        .string()
        .optional()
        .describe('Project start date (ISO format, default: today)'),
      workItemIds: z
        .array(z.string())
        .optional()
        .describe('Specific work items to estimate (default: all active)'),
      teamSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Team size for capacity calculation'),
      hoursPerWeek: z
        .number()
        .min(10)
        .max(60)
        .optional()
        .describe('Available hours per person per week (default: 40)'),
      includeBuffer: z
        .boolean()
        .optional()
        .describe('Add buffer time for uncertainty (default: true)'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        startDate,
        workItemIds,
        teamSize = 3,
        hoursPerWeek = 40,
        includeBuffer = true,
      } = params

      return {
        type: 'analysis_result' as const,
        result: {
          toolName: 'suggestTimeline',
          success: true,
          summary: `Timeline estimation for ${workItemIds?.length || 'all'} work items`,
          findings: [
            {
              id: 'timeline-1',
              type: 'milestone',
              title: 'Estimated Milestones',
              description: 'Will calculate milestone dates based on dependencies and effort',
              confidence: 75,
            },
            {
              id: 'timeline-2',
              type: 'critical_path',
              title: 'Critical Path Analysis',
              description: 'Will identify items that cannot be delayed',
              confidence: 85,
            },
          ],
          metadata: {
            workspaceId,
            teamId,
            startDate: startDate || new Date().toISOString(),
            teamSize,
            hoursPerWeek,
            includeBuffer,
            bufferPercentage: includeBuffer ? 20 : 0,
          },
          executionTime: 0,
        },
        toolCallId,
      }
    },
  }),
  {
    name: 'suggestTimeline',
    displayName: 'Suggest Timeline',
    description: 'Estimate dates and milestones for work items',
    category: TOOL_CATEGORIES.OPTIMIZATION,
    requiresApproval: false,
    isReversible: false,
    actionType: 'suggest',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['timeline', 'estimate', 'date', 'milestone', 'schedule', 'deadline', 'critical path'],
    inputExamples: [
      {
        description: 'User wants timeline estimates for the entire project',
        userMessage: 'When can we expect to finish all these features?',
        input: {
          teamSize: 5,
          hoursPerWeek: 40,
          includeBuffer: true,
        },
      },
      {
        description: 'User wants estimates for specific features',
        userMessage: 'How long will the payments feature take to complete?',
        input: {
          workItemIds: ['payments-feature-id'],
          teamSize: 2,
          includeBuffer: true,
        },
      },
      {
        description: 'User is planning a sprint with a specific start date',
        userMessage: 'If we start next Monday, when would these features be ready?',
        input: {
          startDate: '2025-01-06',
          hoursPerWeek: 35,
          includeBuffer: true,
        },
      },
    ],
  }
)

// =============================================================================
// DEDUPLICATE ITEMS TOOL
// =============================================================================

/**
 * Find and suggest merging duplicate items
 *
 * Identifies potential duplicates based on:
 * - Name similarity
 * - Purpose overlap
 * - Tag matching
 *
 * Requires approval since it merges items.
 */
export const deduplicateItemsTool = toolRegistry.register(
  tool({
    description:
      'Find potential duplicate work items and suggest merging them. Uses name similarity, description overlap, and tag matching to identify duplicates.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      similarityThreshold: z
        .number()
        .min(0.5)
        .max(1)
        .optional()
        .describe('Minimum similarity score to flag as duplicate (default: 0.7)'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived items in duplicate detection (default: false)'),
      autoMerge: z
        .boolean()
        .optional()
        .describe('If true, returns merge preview. If false, returns analysis only.'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        similarityThreshold = 0.7,
        includeArchived = false,
        autoMerge = true,
      } = params

      // In real implementation, would find duplicates
      const sampleChanges = [
        {
          id: 'item-1',
          type: 'work_item',
          name: 'User Authentication',
          before: { standalone: true },
          after: { mergedWith: 'item-2' },
          change: 'merge' as const,
        },
        {
          id: 'item-2',
          type: 'work_item',
          name: 'Login System',
          before: { standalone: true },
          after: { absorbs: 'item-1' },
          change: 'merge' as const,
        },
      ]

      if (!autoMerge) {
        return {
          type: 'analysis_result' as const,
          result: {
            toolName: 'deduplicateItems',
            success: true,
            summary: 'Duplicate detection analysis',
            findings: [
              {
                id: 'dup-1',
                type: 'duplicate_pair',
                title: 'Potential Duplicate Found',
                description: '"User Authentication" and "Login System" are 85% similar',
                confidence: 85,
                severity: 'warning' as const,
                suggestedAction: {
                  toolName: 'deduplicateItems',
                  params: { workspaceId, teamId, autoMerge: true },
                  description: 'Merge these items',
                },
              },
            ],
            metadata: {
              workspaceId,
              teamId,
              similarityThreshold,
              includeArchived,
            },
            executionTime: 0,
          },
          toolCallId,
        }
      }

      return createOptimizationPreview({
        action: 'update',
        entityType: 'work_item',
        description: 'Merge duplicate work items',
        changes: sampleChanges,
        itemsAffected: 2,
        estimatedBenefit: 'Reduces confusion and consolidates effort',
        warnings: [
          'Merged items will have their tasks and dependencies combined',
          'The newer item will be archived with a link to the merged result',
        ],
        toolCallId,
      })
    },
  }),
  {
    name: 'deduplicateItems',
    displayName: 'Deduplicate Items',
    description: 'Find and merge duplicate work items',
    category: TOOL_CATEGORIES.OPTIMIZATION,
    requiresApproval: true,
    isReversible: true,
    actionType: 'update',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['duplicate', 'merge', 'consolidate', 'similar', 'cleanup', 'dedupe'],
    inputExamples: [
      {
        description: 'User wants to find and merge duplicates',
        userMessage: 'Find and merge any duplicate features in my workspace',
        input: {
          similarityThreshold: 0.7,
          autoMerge: true,
        },
      },
      {
        description: 'User only wants to see potential duplicates without merging',
        userMessage: 'Are there any duplicate work items I should know about?',
        input: {
          similarityThreshold: 0.6,
          autoMerge: false,
        },
      },
      {
        description: 'User wants strict duplicate detection including archived',
        userMessage: 'Find duplicates with high confidence, include archived items',
        input: {
          similarityThreshold: 0.85,
          includeArchived: true,
          autoMerge: true,
        },
      },
    ],
  }
)

// =============================================================================
// BUNDLED OPTIMIZATION TOOLS
// =============================================================================

/**
 * All optimization tools (5 total)
 *
 * These tools optimize and improve existing data:
 * - prioritizeFeatures: RICE/WSJF scoring (requires approval)
 * - balanceWorkload: Task redistribution (requires approval)
 * - identifyRisks: Risk analysis (no approval)
 * - suggestTimeline: Date estimation (no approval)
 * - deduplicateItems: Merge duplicates (requires approval)
 */
export const optimizationTools = {
  prioritizeFeatures: prioritizeFeaturesTool,
  balanceWorkload: balanceWorkloadTool,
  identifyRisks: identifyRisksTool,
  suggestTimeline: suggestTimelineTool,
  deduplicateItems: deduplicateItemsTool,
}

/**
 * Array of tool names for iteration
 */
export const optimizationToolNames = Object.keys(optimizationTools) as Array<keyof typeof optimizationTools>

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type OptimizationToolName = keyof typeof optimizationTools
