/**
 * Analysis Tools for Agentic AI Mode
 *
 * Tools that analyze existing data without making changes:
 * - analyzeFeedback: Sentiment analysis of customer feedback
 * - suggestDependencies: Find missing dependencies between work items
 * - findGaps: Identify gaps in feature coverage
 * - summarizeWorkItem: Generate AI summary of a work item
 * - extractRequirements: Parse requirements from unstructured text
 *
 * All analysis tools follow the two-step preview pattern:
 * 1. Tool returns a scope preview (what will be analyzed)
 * 2. User confirms, then tool runs analysis
 * 3. Results include actionable suggestions that link to creation tools
 *
 * Analysis tools:
 * - Do NOT require approval (they don't modify data)
 * - Are NOT reversible (nothing to undo)
 * - Return scope previews followed by detailed results
 */

import { tool } from 'ai'
import { z } from 'zod'
import { toolRegistry, TOOL_CATEGORIES } from './tool-registry'
import {
  type AnalysisScopePreview,
  type AnalysisResult,
} from '../schemas/agentic-schemas'

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a standardized scope preview response (Step 1 of two-step analysis)
 */
function createScopePreview(options: {
  toolName: string
  displayName: string
  entityCount: number
  entityTypes: string[]
  estimatedTime: string
  description: string
  dateRange?: { from?: string; to?: string }
}): AnalysisScopePreview {
  return {
    toolName: options.toolName,
    displayName: options.displayName,
    scope: {
      entityCount: options.entityCount,
      entityTypes: options.entityTypes,
      dateRange: options.dateRange,
    },
    estimatedTime: options.estimatedTime,
    description: options.description,
  }
}

/**
 * Create a standardized analysis result response (Step 2)
 */
function createAnalysisResult(options: {
  toolName: string
  success: boolean
  summary: string
  findings: Array<{
    id: string
    type: string
    title: string
    description: string
    confidence: number
    severity?: 'info' | 'warning' | 'critical'
    suggestedAction?: {
      toolName: string
      params: Record<string, unknown>
      description: string
    }
    metadata?: Record<string, unknown>
  }>
  metadata?: Record<string, unknown>
  executionTime: number
}): AnalysisResult {
  return {
    toolName: options.toolName,
    success: options.success,
    summary: options.summary,
    findings: options.findings,
    metadata: options.metadata,
    executionTime: options.executionTime,
  }
}

// =============================================================================
// ANALYZE FEEDBACK TOOL
// =============================================================================

/**
 * Analyze customer feedback for sentiment and themes
 *
 * This tool examines feedback/insights in a workspace to:
 * - Identify overall sentiment distribution
 * - Extract common themes and topics
 * - Surface actionable improvement suggestions
 */
export const analyzeFeedbackTool = toolRegistry.register(
  tool({
    description:
      'Analyze customer feedback and insights in the workspace. Performs sentiment analysis, identifies common themes, and suggests actionable improvements. Use this to understand customer voice and prioritize features.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID to analyze'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      includeLinked: z
        .boolean()
        .optional()
        .describe('Include feedback linked to work items (default: true)'),
      sentiment: z
        .enum(['positive', 'neutral', 'negative', 'all'])
        .optional()
        .describe('Filter by sentiment (default: all)'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum feedback items to analyze (default: 50)'),
      previewOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only scope preview without running analysis'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        includeLinked = true,
        sentiment = 'all',
        limit = 50,
        previewOnly = false,
      } = params

      // If preview only, return scope information
      if (previewOnly) {
        return {
          type: 'scope_preview' as const,
          preview: createScopePreview({
            toolName: 'analyzeFeedback',
            displayName: 'Analyze Customer Feedback',
            entityCount: limit, // In real implementation, query actual count
            entityTypes: ['insight', 'feedback'],
            estimatedTime: '~2-5 seconds',
            description: `Will analyze up to ${limit} feedback items${sentiment !== 'all' ? ` with ${sentiment} sentiment` : ''}`,
          }),
          toolCallId,
        }
      }

      // Actual analysis (in real implementation, would query DB and call AI)
      const startTime = Date.now()

      // Simulated analysis result structure
      return {
        type: 'analysis_result' as const,
        result: createAnalysisResult({
          toolName: 'analyzeFeedback',
          success: true,
          summary: 'Analysis will process feedback data when connected to database',
          findings: [],
          metadata: {
            workspaceId,
            teamId,
            filters: { includeLinked, sentiment, limit },
          },
          executionTime: Date.now() - startTime,
        }),
        toolCallId,
      }
    },
  }),
  {
    name: 'analyzeFeedback',
    displayName: 'Analyze Customer Feedback',
    description: 'Perform sentiment analysis and theme extraction on customer feedback',
    category: TOOL_CATEGORIES.ANALYSIS,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'medium',
    targetEntity: 'insight',
    keywords: ['analyze', 'feedback', 'sentiment', 'customer', 'voice', 'themes', 'insights'],
    inputExamples: [
      {
        description: 'User wants to understand overall customer sentiment',
        userMessage: 'Analyze all the customer feedback we have collected',
        input: {
          sentiment: 'all',
          limit: 50,
        },
      },
      {
        description: 'User wants to focus on negative feedback to find issues',
        userMessage: 'Show me only the negative feedback so I can prioritize fixes',
        input: {
          sentiment: 'negative',
          limit: 30,
        },
      },
      {
        description: 'User wants a quick preview before full analysis',
        userMessage: 'How much feedback do we have to analyze?',
        input: {
          previewOnly: true,
        },
      },
    ],
  }
)

// =============================================================================
// SUGGEST DEPENDENCIES TOOL
// =============================================================================

/**
 * Suggest missing dependencies between work items
 *
 * This tool analyzes work item names, purposes, and existing dependencies
 * to identify potential relationships that should be added.
 */
export const suggestDependenciesTool = toolRegistry.register(
  tool({
    description:
      'Analyze work items in a workspace to suggest missing dependencies and relationships. Identifies items that should be linked based on their names, descriptions, and completion requirements.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID to analyze'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      workItemId: z
        .string()
        .optional()
        .describe('Focus on dependencies for a specific work item'),
      connectionTypes: z
        .array(z.enum(['dependency', 'blocks', 'complements', 'relates_to']))
        .optional()
        .describe('Types of connections to suggest (default: all)'),
      minConfidence: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Minimum confidence threshold (default: 60)'),
      previewOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only scope preview'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        workItemId,
        connectionTypes = ['dependency', 'blocks', 'complements', 'relates_to'],
        minConfidence = 60,
        previewOnly = false,
      } = params

      if (previewOnly) {
        return {
          type: 'scope_preview' as const,
          preview: createScopePreview({
            toolName: 'suggestDependencies',
            displayName: 'Suggest Dependencies',
            entityCount: workItemId ? 1 : 50, // Would query actual count
            entityTypes: ['work_item', 'linked_item'],
            estimatedTime: workItemId ? '~1-2 seconds' : '~3-5 seconds',
            description: workItemId
              ? 'Will analyze dependencies for the selected work item'
              : 'Will analyze all work items for missing dependencies',
          }),
          toolCallId,
        }
      }

      const startTime = Date.now()

      return {
        type: 'analysis_result' as const,
        result: createAnalysisResult({
          toolName: 'suggestDependencies',
          success: true,
          summary: 'Dependency analysis will run when connected to database',
          findings: [],
          metadata: {
            workspaceId,
            teamId,
            workItemId,
            connectionTypes,
            minConfidence,
          },
          executionTime: Date.now() - startTime,
        }),
        toolCallId,
      }
    },
  }),
  {
    name: 'suggestDependencies',
    displayName: 'Suggest Dependencies',
    description: 'Find missing dependencies between work items',
    category: TOOL_CATEGORIES.ANALYSIS,
    requiresApproval: false,
    isReversible: false,
    actionType: 'suggest',
    estimatedDuration: 'medium',
    targetEntity: 'linked_item',
    keywords: ['suggest', 'dependency', 'relationship', 'blocks', 'relates', 'link', 'missing'],
    inputExamples: [
      {
        description: 'User wants to find all missing dependencies in the workspace',
        userMessage: 'What dependencies am I missing between my features?',
        input: {
          connectionTypes: ['dependency', 'blocks'],
          minConfidence: 60,
        },
      },
      {
        description: 'User wants dependency suggestions for a specific work item',
        userMessage: 'What should the authentication feature depend on?',
        input: {
          workItemId: 'auth-feature-id',
          connectionTypes: ['dependency', 'complements'],
          minConfidence: 70,
        },
      },
      {
        description: 'User wants to preview scope before running analysis',
        userMessage: 'How many work items will you analyze for dependencies?',
        input: {
          previewOnly: true,
        },
      },
    ],
  }
)

// =============================================================================
// FIND GAPS TOOL
// =============================================================================

/**
 * Find gaps in feature coverage
 *
 * Analyzes the workspace to identify:
 * - Features without timeline breakdowns
 * - Work items without tasks
 * - Orphaned items not connected to anything
 * - Missing test coverage indicators
 */
export const findGapsTool = toolRegistry.register(
  tool({
    description:
      'Identify gaps in the workspace such as features without timeline breakdowns, work items without tasks, orphaned items, and incomplete coverage. Helps ensure comprehensive planning.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID to analyze'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      gapTypes: z
        .array(z.enum([
          'no_timeline',      // Work items without timeline breakdown
          'no_tasks',         // Work items without execution tasks
          'no_dependencies',  // Orphaned items with no links
          'no_description',   // Items missing purpose/description
          'stale',            // Items not updated in 30+ days
        ]))
        .optional()
        .describe('Types of gaps to look for (default: all)'),
      phase: z
        .enum(['research', 'planning', 'development', 'testing', 'complete', 'all'])
        .optional()
        .describe('Filter by phase (default: all)'),
      previewOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only scope preview'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        gapTypes = ['no_timeline', 'no_tasks', 'no_dependencies', 'no_description', 'stale'],
        phase = 'all',
        previewOnly = false,
      } = params

      if (previewOnly) {
        return {
          type: 'scope_preview' as const,
          preview: createScopePreview({
            toolName: 'findGaps',
            displayName: 'Find Coverage Gaps',
            entityCount: 50, // Would query actual count
            entityTypes: ['work_item', 'timeline_item', 'product_task'],
            estimatedTime: '~2-4 seconds',
            description: `Will check ${gapTypes.length} gap types${phase !== 'all' ? ` in ${phase} phase` : ''}`,
          }),
          toolCallId,
        }
      }

      const startTime = Date.now()

      return {
        type: 'analysis_result' as const,
        result: createAnalysisResult({
          toolName: 'findGaps',
          success: true,
          summary: 'Gap analysis will run when connected to database',
          findings: [],
          metadata: {
            workspaceId,
            teamId,
            gapTypes,
            phase,
          },
          executionTime: Date.now() - startTime,
        }),
        toolCallId,
      }
    },
  }),
  {
    name: 'findGaps',
    displayName: 'Find Coverage Gaps',
    description: 'Identify gaps like missing timelines, tasks, or descriptions',
    category: TOOL_CATEGORIES.ANALYSIS,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['find', 'gaps', 'missing', 'incomplete', 'coverage', 'orphan', 'stale'],
    inputExamples: [
      {
        description: 'User wants to find all incomplete work items',
        userMessage: 'Which features are missing timeline breakdowns or tasks?',
        input: {
          gapTypes: ['no_timeline', 'no_tasks'],
          phase: 'all',
        },
      },
      {
        description: 'User wants to find stale items that need attention',
        userMessage: 'What items have not been updated in a while?',
        input: {
          gapTypes: ['stale'],
        },
      },
      {
        description: 'User wants to find orphaned items in development phase',
        userMessage: 'Find features in development that have no dependencies',
        input: {
          gapTypes: ['no_dependencies'],
          phase: 'development',
        },
      },
    ],
  }
)

// =============================================================================
// SUMMARIZE WORK ITEM TOOL
// =============================================================================

/**
 * Generate an AI summary of a work item
 *
 * Creates a concise summary including:
 * - Key information (type, phase, priority)
 * - Related tasks and timeline items
 * - Dependencies and blockers
 * - Progress status and next steps
 */
export const summarizeWorkItemTool = toolRegistry.register(
  tool({
    description:
      'Generate a comprehensive AI summary of a work item including its tasks, timeline, dependencies, and progress. Useful for quick status updates and stakeholder communication.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      workItemId: z.string().describe('ID of the work item to summarize'),
      includeRelated: z
        .boolean()
        .optional()
        .describe('Include related work items in summary (default: true)'),
      format: z
        .enum(['brief', 'detailed', 'executive'])
        .optional()
        .describe('Summary format (default: detailed)'),
      previewOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only scope preview'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        workItemId,
        includeRelated = true,
        format = 'detailed',
        previewOnly = false,
      } = params

      if (previewOnly) {
        return {
          type: 'scope_preview' as const,
          preview: createScopePreview({
            toolName: 'summarizeWorkItem',
            displayName: 'Summarize Work Item',
            entityCount: includeRelated ? 10 : 1, // Estimate
            entityTypes: ['work_item', 'product_task', 'timeline_item', 'linked_item'],
            estimatedTime: '~2-3 seconds',
            description: `Will generate ${format} summary${includeRelated ? ' including related items' : ''}`,
          }),
          toolCallId,
        }
      }

      const startTime = Date.now()

      return {
        type: 'analysis_result' as const,
        result: createAnalysisResult({
          toolName: 'summarizeWorkItem',
          success: true,
          summary: 'Summary generation will run when connected to database',
          findings: [
            {
              id: 'summary',
              type: 'summary',
              title: 'Work Item Summary',
              description: 'Summary content will be generated here',
              confidence: 100,
            },
          ],
          metadata: {
            workspaceId,
            teamId,
            workItemId,
            includeRelated,
            format,
          },
          executionTime: Date.now() - startTime,
        }),
        toolCallId,
      }
    },
  }),
  {
    name: 'summarizeWorkItem',
    displayName: 'Summarize Work Item',
    description: 'Generate an AI summary of a work item with tasks and dependencies',
    category: TOOL_CATEGORIES.ANALYSIS,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['summarize', 'summary', 'overview', 'status', 'brief', 'executive'],
    inputExamples: [
      {
        description: 'User wants a detailed summary for stakeholder update',
        userMessage: 'Give me a full summary of the payment integration feature',
        input: {
          workItemId: 'payment-feature-id',
          format: 'detailed',
          includeRelated: true,
        },
      },
      {
        description: 'User wants a quick status check',
        userMessage: 'Summarize where we are with the dashboard redesign',
        input: {
          workItemId: 'dashboard-redesign-id',
          format: 'brief',
          includeRelated: false,
        },
      },
      {
        description: 'User needs executive summary for leadership',
        userMessage: 'I need an executive summary of the mobile app feature for leadership',
        input: {
          workItemId: 'mobile-app-id',
          format: 'executive',
          includeRelated: true,
        },
      },
    ],
  }
)

// =============================================================================
// EXTRACT REQUIREMENTS TOOL
// =============================================================================

/**
 * Extract requirements from unstructured text
 *
 * Parses notes, meeting transcripts, or PRDs to extract:
 * - Functional requirements
 * - Non-functional requirements
 * - Acceptance criteria
 * - Suggested work items to create
 */
export const extractRequirementsTool = toolRegistry.register(
  tool({
    description:
      'Extract structured requirements from unstructured text like notes, meeting transcripts, or PRDs. Identifies functional/non-functional requirements and suggests work items to create.',
    inputSchema: z.object({
      workspaceId: z.string().describe('Workspace ID'),
      teamId: z.string().describe('Team ID for multi-tenancy'),
      text: z
        .string()
        .min(50)
        .max(10000)
        .describe('Text to analyze (50-10000 characters)'),
      sourceType: z
        .enum(['note', 'meeting', 'prd', 'email', 'slack', 'other'])
        .optional()
        .describe('Type of source text for better parsing'),
      extractTypes: z
        .array(z.enum([
          'functional',      // What the system should do
          'non_functional',  // How it should perform
          'acceptance',      // How to verify completion
          'constraints',     // Limitations and boundaries
        ]))
        .optional()
        .describe('Types of requirements to extract (default: all)'),
      previewOnly: z
        .boolean()
        .optional()
        .describe('If true, returns only scope preview'),
    }),
    execute: async (params, { toolCallId }) => {
      const {
        workspaceId,
        teamId,
        text,
        sourceType = 'other',
        extractTypes = ['functional', 'non_functional', 'acceptance', 'constraints'],
        previewOnly = false,
      } = params

      const wordCount = text.split(/\s+/).length

      if (previewOnly) {
        return {
          type: 'scope_preview' as const,
          preview: createScopePreview({
            toolName: 'extractRequirements',
            displayName: 'Extract Requirements',
            entityCount: wordCount,
            entityTypes: ['text_analysis'],
            estimatedTime: wordCount > 500 ? '~3-5 seconds' : '~1-2 seconds',
            description: `Will extract ${extractTypes.join(', ')} requirements from ${wordCount} words`,
          }),
          toolCallId,
        }
      }

      const startTime = Date.now()

      return {
        type: 'analysis_result' as const,
        result: createAnalysisResult({
          toolName: 'extractRequirements',
          success: true,
          summary: 'Requirement extraction will run when connected to AI model',
          findings: [],
          metadata: {
            workspaceId,
            teamId,
            sourceType,
            extractTypes,
            wordCount,
            characterCount: text.length,
          },
          executionTime: Date.now() - startTime,
        }),
        toolCallId,
      }
    },
  }),
  {
    name: 'extractRequirements',
    displayName: 'Extract Requirements',
    description: 'Parse requirements from unstructured text',
    category: TOOL_CATEGORIES.ANALYSIS,
    requiresApproval: false,
    isReversible: false,
    actionType: 'analyze',
    estimatedDuration: 'medium',
    targetEntity: 'work_item',
    keywords: ['extract', 'requirements', 'parse', 'prd', 'meeting', 'notes', 'functional'],
    inputExamples: [
      {
        description: 'User wants to extract requirements from meeting notes',
        userMessage: 'Extract the requirements from these meeting notes: We discussed adding a user profile page with avatar upload, bio field, and social links.',
        input: {
          text: 'We discussed adding a user profile page with avatar upload, bio field, and social links.',
          sourceType: 'meeting',
          extractTypes: ['functional', 'acceptance'],
        },
      },
      {
        description: 'User wants to parse a PRD document',
        userMessage: 'Parse this PRD and identify all the requirements',
        input: {
          text: '[PRD content here - 500+ words]',
          sourceType: 'prd',
          extractTypes: ['functional', 'non_functional', 'constraints'],
        },
      },
      {
        description: 'User wants to extract from Slack messages',
        userMessage: 'Extract any requirements from this Slack conversation about the notification system',
        input: {
          text: '[Slack messages about notification preferences and delivery channels]',
          sourceType: 'slack',
          extractTypes: ['functional'],
        },
      },
    ],
  }
)

// =============================================================================
// BUNDLED ANALYSIS TOOLS
// =============================================================================

/**
 * All analysis tools (5 total)
 *
 * These tools analyze existing data without modifying it:
 * - Feedback sentiment and themes
 * - Dependency suggestions
 * - Coverage gap identification
 * - Work item summaries
 * - Requirement extraction
 */
export const analysisTools = {
  analyzeFeedback: analyzeFeedbackTool,
  suggestDependencies: suggestDependenciesTool,
  findGaps: findGapsTool,
  summarizeWorkItem: summarizeWorkItemTool,
  extractRequirements: extractRequirementsTool,
}

/**
 * Array of tool names for iteration
 */
export const analysisToolNames = Object.keys(analysisTools) as Array<keyof typeof analysisTools>

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type AnalysisToolName = keyof typeof analysisTools

/**
 * Analysis tool response types for frontend handling
 */
export type AnalysisResponse =
  | { type: 'scope_preview'; preview: AnalysisScopePreview; toolCallId: string }
  | { type: 'analysis_result'; result: AnalysisResult; toolCallId: string }
