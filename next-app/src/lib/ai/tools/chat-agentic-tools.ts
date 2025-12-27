/**
 * Chat-Friendly Agentic Tools
 *
 * These tools are designed for use in the chat interface. Instead of
 * executing immediately, they return confirmation requests that the
 * frontend displays as ToolConfirmationCard components.
 *
 * When the user confirms, the frontend calls the /api/ai/agent/execute
 * endpoint with the confirmed parameters.
 *
 * Architecture:
 * 1. User types natural language → AI parses and calls these tools
 * 2. Tool returns confirmation_request with extracted params
 * 3. Frontend shows ToolConfirmationCard
 * 4. User clicks Confirm → Frontend calls /api/ai/agent/execute
 * 5. Result displayed in chat
 *
 * Updated for AI SDK v5:
 * - Uses `inputSchema` instead of `parameters`
 * - Execute function receives (input, options) with explicit types
 */

import { tool } from 'ai'
import { z } from 'zod'

// =============================================================================
// TYPES
// =============================================================================

export interface ConfirmationRequest {
  type: 'confirmation_request'
  toolName: string
  displayName: string
  category: 'creation' | 'analysis' | 'optimization' | 'strategy'
  extractedParams: Record<string, unknown>
  description: string
  warnings?: string[]
}

export interface AnalysisScopeResult {
  type: 'analysis_scope'
  toolName: string
  displayName: string
  category: 'analysis'
  description: string
  scope?: string
  estimatedTime: string
  executeImmediately: boolean
}

// =============================================================================
// HELPER FUNCTION
// =============================================================================

function createConfirmationRequest(options: {
  toolName: string
  displayName: string
  category: 'creation' | 'analysis' | 'optimization' | 'strategy'
  extractedParams: Record<string, unknown>
  description: string
  warnings?: string[]
}): ConfirmationRequest {
  return {
    type: 'confirmation_request',
    ...options,
  }
}

// =============================================================================
// SCHEMAS (Defined separately for reuse in execute function types)
// =============================================================================

const createWorkItemSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(100)
    .describe('Name of the work item extracted from user message'),
  type: z
    .enum(['concept', 'feature', 'bug', 'enhancement'])
    .describe(
      'Type inferred from context: concept (ideas), feature (new functionality), bug (fixes), enhancement (improvements)'
    ),
  purpose: z
    .string()
    .max(500)
    .optional()
    .describe('Purpose or description extracted from user message'),
  priority: z
    .enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Priority if mentioned, otherwise default to medium'),
  tags: z
    .array(z.string())
    .max(5)
    .optional()
    .describe('Relevant tags extracted from user message'),
})

const createTaskSchema = z.object({
  workItemId: z
    .string()
    .describe('ID of the parent work item (may need to be looked up)'),
  name: z.string().min(3).max(100).describe('Task name extracted from user message'),
  description: z.string().max(500).optional().describe('Task description if provided'),
  priority: z
    .enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Priority if mentioned'),
  dueDate: z.string().optional().describe('Due date if mentioned (ISO format)'),
})

const createDependencySchema = z.object({
  sourceId: z.string().describe('Source work item ID'),
  targetId: z.string().describe('Target work item ID'),
  connectionType: z
    .enum(['dependency', 'blocks', 'complements', 'relates_to'])
    .describe('Type of relationship'),
  reason: z.string().max(300).optional().describe('Reason for the dependency'),
})

const createTimelineItemSchema = z.object({
  workItemId: z.string().describe('ID of the parent work item'),
  name: z.string().min(3).max(100).describe('Timeline item name'),
  timeframe: z
    .enum(['mvp', 'short', 'long'])
    .describe('Timeline category: mvp (must-have), short (1-3 months), long (3+ months)'),
  description: z.string().max(500).optional().describe('Description if provided'),
})

const createInsightSchema = z.object({
  title: z.string().min(3).max(100).describe('Insight title'),
  content: z.string().min(10).max(2000).describe('Insight content'),
  source: z.string().max(200).optional().describe('Source of the insight'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative'])
    .optional()
    .describe('Sentiment if detectable'),
  tags: z.array(z.string()).max(5).optional().describe('Relevant tags'),
})

const analyzeFeedbackSchema = z.object({
  scope: z
    .string()
    .optional()
    .describe('What to analyze - specific item, all feedback, or filtered set'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative', 'all'])
    .optional()
    .describe('Filter by sentiment'),
})

const suggestDependenciesSchema = z.object({
  workItemId: z
    .string()
    .optional()
    .describe('Specific work item to analyze, or leave empty for all'),
})

// Type definitions from schemas
type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>
type CreateTaskInput = z.infer<typeof createTaskSchema>
type CreateDependencyInput = z.infer<typeof createDependencySchema>
type CreateTimelineItemInput = z.infer<typeof createTimelineItemSchema>
type CreateInsightInput = z.infer<typeof createInsightSchema>
type AnalyzeFeedbackInput = z.infer<typeof analyzeFeedbackSchema>
type SuggestDependenciesInput = z.infer<typeof suggestDependenciesSchema>

// =============================================================================
// CREATION TOOLS (Chat Versions)
// =============================================================================

/**
 * Chat-friendly Create Work Item tool
 *
 * Extracts work item details from natural language and returns
 * a confirmation request for the user to review.
 */
export const chatCreateWorkItemTool = tool({
  description:
    'Create a new work item (feature, bug, concept, or enhancement) based on the user description. Always ask for confirmation before creating.',
  inputSchema: createWorkItemSchema,
  execute: async (
    params: CreateWorkItemInput
  ): Promise<ConfirmationRequest> => {
    return createConfirmationRequest({
      toolName: 'createWorkItem',
      displayName: 'Create Work Item',
      category: 'creation',
      extractedParams: {
        name: params.name,
        type: params.type,
        purpose: params.purpose || undefined,
        priority: params.priority || 'medium',
        tags: params.tags || [],
      },
      description: `Create ${params.type}: "${params.name}"`,
      warnings:
        params.priority === 'critical'
          ? ['Critical priority items will appear at the top of the backlog']
          : undefined,
    })
  },
})

/**
 * Chat-friendly Create Task tool
 */
export const chatCreateTaskTool = tool({
  description:
    'Create a task under an existing work item. Tasks are specific executable work items. Always ask for confirmation before creating.',
  inputSchema: createTaskSchema,
  execute: async (
    params: CreateTaskInput
  ): Promise<ConfirmationRequest> => {
    return createConfirmationRequest({
      toolName: 'createTask',
      displayName: 'Create Task',
      category: 'creation',
      extractedParams: {
        workItemId: params.workItemId,
        name: params.name,
        description: params.description,
        priority: params.priority || 'medium',
        dueDate: params.dueDate,
      },
      description: `Create task: "${params.name}" under work item ${params.workItemId}`,
    })
  },
})

/**
 * Chat-friendly Create Dependency tool
 */
export const chatCreateDependencyTool = tool({
  description:
    'Create a dependency or relationship between two work items. Always ask for confirmation before creating.',
  inputSchema: createDependencySchema,
  execute: async (
    params: CreateDependencyInput
  ): Promise<ConfirmationRequest> => {
    const typeLabels: Record<typeof params.connectionType, string> = {
      dependency: 'depends on',
      blocks: 'blocks',
      complements: 'complements',
      relates_to: 'relates to',
    }

    return createConfirmationRequest({
      toolName: 'createDependency',
      displayName: 'Create Dependency',
      category: 'creation',
      extractedParams: {
        sourceId: params.sourceId,
        targetId: params.targetId,
        connectionType: params.connectionType,
        reason: params.reason,
      },
      description: `Create link: ${params.sourceId} ${typeLabels[params.connectionType]} ${params.targetId}`,
      warnings:
        params.connectionType === 'blocks'
          ? ['Blocking dependencies may affect timeline scheduling']
          : undefined,
    })
  },
})

/**
 * Chat-friendly Create Timeline Item tool
 */
export const chatCreateTimelineItemTool = tool({
  description:
    'Create a timeline breakdown (MVP, Short-term, or Long-term) under a work item. Always ask for confirmation before creating.',
  inputSchema: createTimelineItemSchema,
  execute: async (
    params: CreateTimelineItemInput
  ): Promise<ConfirmationRequest> => {
    const timeframeLabels: Record<typeof params.timeframe, string> = {
      mvp: 'MVP (Must Have)',
      short: 'Short-term (1-3 months)',
      long: 'Long-term (3+ months)',
    }

    return createConfirmationRequest({
      toolName: 'createTimelineItem',
      displayName: 'Create Timeline Item',
      category: 'creation',
      extractedParams: {
        workItemId: params.workItemId,
        name: params.name,
        timeframe: params.timeframe,
        description: params.description,
      },
      description: `Create ${timeframeLabels[params.timeframe]} item: "${params.name}"`,
      warnings:
        params.timeframe === 'mvp'
          ? ['MVP items are critical for launch - ensure this is truly essential']
          : undefined,
    })
  },
})

/**
 * Chat-friendly Create Insight tool
 */
export const chatCreateInsightTool = tool({
  description:
    'Create a customer insight or feedback record. Always ask for confirmation before creating.',
  inputSchema: createInsightSchema,
  execute: async (
    params: CreateInsightInput
  ): Promise<ConfirmationRequest> => {
    return createConfirmationRequest({
      toolName: 'createInsight',
      displayName: 'Create Customer Insight',
      category: 'creation',
      extractedParams: {
        title: params.title,
        content: params.content,
        source: params.source,
        sentiment: params.sentiment,
        tags: params.tags,
      },
      description: `Create ${params.sentiment || 'neutral'} insight: "${params.title}"`,
      warnings:
        params.sentiment === 'negative'
          ? ['Negative feedback often highlights critical improvement opportunities']
          : undefined,
    })
  },
})

// =============================================================================
// ANALYSIS TOOLS (Chat Versions)
// These don't require confirmation but return formatted results
// =============================================================================

/**
 * Chat-friendly Analyze Feedback tool
 *
 * For analysis tools, we still return a confirmation for the scope,
 * but then execute immediately since they don't modify data.
 */
export const chatAnalyzeFeedbackTool = tool({
  description:
    'Analyze customer feedback for sentiment and themes. This is read-only analysis.',
  inputSchema: analyzeFeedbackSchema,
  execute: async (
    params: AnalyzeFeedbackInput
  ): Promise<AnalysisScopeResult> => {
    return {
      type: 'analysis_scope',
      toolName: 'analyzeFeedback',
      displayName: 'Analyze Customer Feedback',
      category: 'analysis',
      description: `Will analyze feedback${params.sentiment && params.sentiment !== 'all' ? ` with ${params.sentiment} sentiment` : ''}`,
      scope: params.scope || 'all feedback',
      estimatedTime: '~2-5 seconds',
      executeImmediately: true,
    }
  },
})

/**
 * Chat-friendly Suggest Dependencies tool
 */
export const chatSuggestDependenciesTool = tool({
  description:
    'Analyze work items to suggest missing dependencies. This is read-only analysis.',
  inputSchema: suggestDependenciesSchema,
  execute: async (
    params: SuggestDependenciesInput
  ): Promise<AnalysisScopeResult> => {
    return {
      type: 'analysis_scope',
      toolName: 'suggestDependencies',
      displayName: 'Suggest Dependencies',
      category: 'analysis',
      description: params.workItemId
        ? `Will analyze dependencies for work item ${params.workItemId}`
        : 'Will analyze all work items for missing dependencies',
      estimatedTime: params.workItemId ? '~1-2 seconds' : '~3-5 seconds',
      executeImmediately: true,
    }
  },
})

// =============================================================================
// BUNDLED CHAT TOOLS
// =============================================================================

/**
 * All chat-friendly tools for use in the unified chat API
 *
 * These return confirmation requests instead of executing directly,
 * enabling the user to review and approve actions.
 */
export const chatAgenticTools = {
  // Creation tools (require confirmation)
  createWorkItem: chatCreateWorkItemTool,
  createTask: chatCreateTaskTool,
  createDependency: chatCreateDependencyTool,
  createTimelineItem: chatCreateTimelineItemTool,
  createInsight: chatCreateInsightTool,

  // Analysis tools (scope preview, then immediate execution)
  analyzeFeedback: chatAnalyzeFeedbackTool,
  suggestDependencies: chatSuggestDependenciesTool,
}

export type ChatAgenticToolName = keyof typeof chatAgenticTools
