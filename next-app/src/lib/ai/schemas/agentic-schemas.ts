/**
 * Zod Schemas for Agentic AI Mode
 *
 * Defines type-safe schemas for:
 * - Tool categories and metadata
 * - Action types and status states
 * - Preview and execution responses
 * - Action history records
 * - Approval workflow types
 *
 * Used with AI SDK v5 for validated, type-safe agentic operations.
 */

import { z } from 'zod'

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/**
 * Tool categories for organizing 20+ AI tools
 */
export const ToolCategorySchema = z.enum([
  'creation',      // Create new entities (work items, tasks, etc.)
  'analysis',      // Analyze existing data
  'optimization',  // Optimize/improve existing entities
  'strategy',      // Strategic recommendations
])

export type ToolCategory = z.infer<typeof ToolCategorySchema>

export const TOOL_CATEGORIES = {
  CREATION: 'creation',
  ANALYSIS: 'analysis',
  OPTIMIZATION: 'optimization',
  STRATEGY: 'strategy',
} as const

/**
 * Action types that tools can perform
 */
export const ActionTypeSchema = z.enum([
  'create',   // Create new entity
  'update',   // Modify existing entity
  'delete',   // Remove entity
  'analyze',  // Read-only analysis
  'suggest',  // Generate suggestions (no direct changes)
])

export type ActionType = z.infer<typeof ActionTypeSchema>

/**
 * Status states for action lifecycle (state machine)
 *
 * Flow: pending → approved → executing → completed/failed
 * Alternative flows:
 *   - pending → cancelled (user cancels)
 *   - completed → rolled_back (user undoes)
 */
export const ActionStatusSchema = z.enum([
  'pending',      // Awaiting user approval
  'approved',     // User approved, ready to execute
  'executing',    // Currently running
  'completed',    // Successfully completed
  'failed',       // Execution failed
  'rolled_back',  // Successfully rolled back
  'cancelled',    // User cancelled before execution
])

export type ActionStatus = z.infer<typeof ActionStatusSchema>

/**
 * Estimated duration for tool execution
 */
export const EstimatedDurationSchema = z.enum([
  'fast',    // < 1 second
  'medium',  // 1-5 seconds
  'slow',    // > 5 seconds
])

export type EstimatedDuration = z.infer<typeof EstimatedDurationSchema>

// =============================================================================
// TOOL EXAMPLE SCHEMA
// =============================================================================

/**
 * Example input for a tool to improve AI tool selection accuracy
 *
 * Based on Anthropic's "Tool Use Best Practices":
 * - Providing concrete examples improves accuracy from ~72% to ~90%
 * - Examples help the AI understand user intent and extract parameters correctly
 * - 2-4 examples per tool is optimal for most cases
 */
export const ToolExampleSchema = z.object({
  description: z.string().min(5).max(200).describe('Brief description of what the user is trying to do'),
  userMessage: z.string().min(5).max(500).describe('Example user message that would trigger this tool'),
  input: z.record(z.string(), z.unknown()).describe('Expected input parameters for this example'),
})

export type ToolExample = z.infer<typeof ToolExampleSchema>

// =============================================================================
// TOOL METADATA SCHEMA
// =============================================================================

/**
 * Metadata attached to each tool for registry management
 */
export const ToolMetadataSchema = z.object({
  name: z.string().min(1).describe('Unique tool identifier (camelCase)'),
  displayName: z.string().min(1).describe('Human-readable tool name'),
  description: z.string().min(10).max(500).describe('What the tool does'),
  category: ToolCategorySchema.describe('Tool category'),
  requiresApproval: z.boolean().describe('Whether user approval is needed before execution'),
  isReversible: z.boolean().describe('Whether the action can be undone'),
  actionType: ActionTypeSchema.describe('Type of action the tool performs'),
  estimatedDuration: EstimatedDurationSchema.describe('Expected execution time'),
  targetEntity: z.string().optional().describe('Entity type this tool operates on (e.g., work_item, task)'),
  keywords: z.array(z.string()).optional().describe('Keywords for search/discovery'),
  inputExamples: z.array(ToolExampleSchema).max(5).optional().describe('Input examples to improve AI tool selection accuracy (2-4 recommended)'),
})

export type ToolMetadata = z.infer<typeof ToolMetadataSchema>

// =============================================================================
// PREVIEW & EXECUTION SCHEMAS
// =============================================================================

/**
 * Preview data returned by tools before execution
 * Used to show users what will happen
 */
export const ActionPreviewSchema = z.object({
  action: ActionTypeSchema.describe('What action will be performed'),
  entityType: z.string().describe('Type of entity being affected'),
  data: z.record(z.string(), z.unknown()).describe('Input parameters for the action'),
  description: z.string().describe('Human-readable description of the action'),
  affectedItems: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    change: z.enum(['create', 'update', 'delete']),
  })).optional().describe('Items that will be affected'),
  estimatedDuration: EstimatedDurationSchema.optional(),
  warnings: z.array(z.string()).optional().describe('Any warnings to show the user'),
})

export type ActionPreview = z.infer<typeof ActionPreviewSchema>

/**
 * Response from a tool execution (before actual DB changes)
 */
export const ToolExecutionResponseSchema = z.object({
  requiresApproval: z.boolean().describe('Whether this needs user approval'),
  preview: ActionPreviewSchema.describe('Preview of what will happen'),
  toolCallId: z.string().describe('Unique identifier for this tool call'),
})

export type ToolExecutionResponse = z.infer<typeof ToolExecutionResponseSchema>

/**
 * Result after executing an approved action
 */
export const ExecutionResultSchema = z.object({
  success: z.boolean().describe('Whether execution succeeded'),
  actionId: z.string().describe('ID of the action record'),
  status: ActionStatusSchema.describe('Current status of the action'),
  result: z.unknown().optional().describe('Result data from the execution'),
  error: z.string().optional().describe('Error message if failed'),
  duration: z.number().optional().describe('Execution duration in milliseconds'),
  rollbackData: z.record(z.string(), z.unknown()).optional().describe('Data needed to undo this action'),
})

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>

// =============================================================================
// ANALYSIS TOOL SCHEMAS (Two-Step Preview Pattern)
// =============================================================================

/**
 * Analysis scope preview (Step 1 of two-step analysis)
 * Shows what will be analyzed before running
 */
export const AnalysisScopePreviewSchema = z.object({
  toolName: z.string().describe('Name of the analysis tool'),
  displayName: z.string().describe('Human-readable name'),
  scope: z.object({
    entityCount: z.number().describe('Number of entities to analyze'),
    entityTypes: z.array(z.string()).describe('Types of entities'),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional().describe('Date range of data'),
  }),
  estimatedTime: z.string().describe('Estimated analysis time (e.g., "~3 seconds")'),
  description: z.string().describe('What the analysis will do'),
})

export type AnalysisScopePreview = z.infer<typeof AnalysisScopePreviewSchema>

/**
 * Analysis result with actionable suggestions (Step 2)
 */
export const AnalysisResultSchema = z.object({
  toolName: z.string().describe('Name of the analysis tool'),
  success: z.boolean().describe('Whether analysis succeeded'),
  summary: z.string().describe('Brief summary of findings'),
  findings: z.array(z.object({
    id: z.string().describe('Unique finding ID'),
    type: z.string().describe('Type of finding'),
    title: z.string().describe('Finding title'),
    description: z.string().describe('Detailed description'),
    confidence: z.number().min(0).max(100).describe('Confidence percentage'),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    suggestedAction: z.object({
      toolName: z.string().describe('Tool to execute for this finding'),
      params: z.record(z.string(), z.unknown()).describe('Parameters for the tool'),
      description: z.string().describe('What this action will do'),
    }).optional().describe('Optional action the user can take'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Additional finding data'),
  })).describe('List of analysis findings'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Additional analysis metadata'),
  executionTime: z.number().describe('Actual execution time in milliseconds'),
})

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// =============================================================================
// ACTION HISTORY SCHEMA
// =============================================================================

/**
 * AI action history record (matches database schema)
 */
export const AIActionHistorySchema = z.object({
  id: z.string().describe('Unique action ID (timestamp-based)'),
  team_id: z.string().describe('Team ID for multi-tenancy'),
  workspace_id: z.string().describe('Workspace ID'),
  user_id: z.string().describe('User who initiated the action'),
  session_id: z.string().describe('Session grouping for multi-step workflows'),

  // Action details
  tool_name: z.string().describe('Name of the tool used'),
  tool_category: ToolCategorySchema.describe('Tool category'),
  action_type: ActionTypeSchema.describe('Type of action'),

  // Input/Output
  input_params: z.record(z.string(), z.unknown()).describe('Input parameters'),
  output_result: z.record(z.string(), z.unknown()).nullable().describe('Execution result'),
  affected_items: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    change: z.string(),
  })).optional().describe('Items affected by this action'),

  // Rollback
  rollback_data: z.record(z.string(), z.unknown()).nullable().describe('Data for undoing the action'),
  is_reversible: z.boolean().optional().describe('Whether action can be undone'),
  rolled_back_at: z.string().nullable().describe('When action was rolled back'),

  // Status
  status: ActionStatusSchema.describe('Current action status'),
  error_message: z.string().nullable().describe('Error message if failed'),

  // Performance
  execution_started_at: z.string().nullable().describe('When execution started'),
  execution_completed_at: z.string().nullable().describe('When execution completed'),
  execution_duration_ms: z.number().nullable().describe('Duration in milliseconds'),

  // Cost tracking
  tokens_used: z.number().optional().describe('AI tokens consumed'),
  cost_usd: z.number().optional().describe('Cost in USD'),
  model_used: z.string().nullable().describe('AI model used'),

  // Timestamps
  created_at: z.string().describe('When action was created'),
  updated_at: z.string().describe('When action was last updated'),
  approved_at: z.string().nullable().describe('When action was approved'),
  approved_by: z.string().nullable().describe('User who approved'),
})

export type AIActionHistory = z.infer<typeof AIActionHistorySchema>

/**
 * Simplified action history for list display
 */
export const AIActionSummarySchema = z.object({
  id: z.string(),
  tool_name: z.string(),
  tool_category: ToolCategorySchema,
  action_type: ActionTypeSchema,
  status: ActionStatusSchema,
  description: z.string().describe('Human-readable description'),
  is_reversible: z.boolean(),
  created_at: z.string(),
  execution_duration_ms: z.number().nullable(),
})

export type AIActionSummary = z.infer<typeof AIActionSummarySchema>

// =============================================================================
// APPROVAL WORKFLOW SCHEMAS
// =============================================================================

/**
 * Pending action for approval queue
 */
export const PendingApprovalSchema = z.object({
  id: z.string().describe('Action ID'),
  tool_name: z.string().describe('Tool name'),
  displayName: z.string().describe('Human-readable tool name'),
  category: ToolCategorySchema.describe('Tool category'),
  preview: ActionPreviewSchema.describe('What will happen'),
  created_at: z.string().describe('When action was created'),
  session_id: z.string().describe('Session for grouping related actions'),
})

export type PendingApproval = z.infer<typeof PendingApprovalSchema>

/**
 * Batch approval request
 */
export const BatchApprovalRequestSchema = z.object({
  actionIds: z.array(z.string()).min(1).describe('IDs of actions to approve'),
  approveAll: z.boolean().optional().describe('Approve all actions in session'),
  sessionId: z.string().optional().describe('Session ID for batch approval'),
})

export type BatchApprovalRequest = z.infer<typeof BatchApprovalRequestSchema>

/**
 * Batch approval result
 */
export const BatchApprovalResultSchema = z.object({
  approved: z.array(z.string()).describe('IDs of successfully approved actions'),
  failed: z.array(z.object({
    id: z.string(),
    error: z.string(),
  })).describe('Actions that failed to approve'),
  totalApproved: z.number(),
  totalFailed: z.number(),
})

export type BatchApprovalResult = z.infer<typeof BatchApprovalResultSchema>

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

/**
 * Execute tool request
 */
export const ExecuteToolRequestSchema = z.object({
  toolName: z.string().describe('Name of the tool to execute'),
  params: z.record(z.string(), z.unknown()).describe('Tool parameters'),
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  sessionId: z.string().optional().describe('Session ID for grouping'),
  skipApproval: z.boolean().optional().describe('Skip approval for admin'),
})

export type ExecuteToolRequest = z.infer<typeof ExecuteToolRequestSchema>

/**
 * Preview tool request
 */
export const PreviewToolRequestSchema = z.object({
  toolName: z.string().describe('Name of the tool to preview'),
  params: z.record(z.string(), z.unknown()).describe('Tool parameters'),
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
})

export type PreviewToolRequest = z.infer<typeof PreviewToolRequestSchema>

/**
 * Suggest tools request
 */
export const SuggestToolsRequestSchema = z.object({
  context: z.string().describe('User message or context'),
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  currentWorkItemId: z.string().optional().describe('Current work item if any'),
})

export type SuggestToolsRequest = z.infer<typeof SuggestToolsRequestSchema>

/**
 * Tool suggestion response
 */
export const ToolSuggestionSchema = z.object({
  toolName: z.string().describe('Suggested tool name'),
  displayName: z.string().describe('Human-readable name'),
  description: z.string().describe('Why this tool is suggested'),
  category: ToolCategorySchema.describe('Tool category'),
  confidence: z.number().min(0).max(100).describe('Confidence percentage'),
  params: z.record(z.string(), z.unknown()).optional().describe('Pre-filled parameters'),
})

export type ToolSuggestion = z.infer<typeof ToolSuggestionSchema>

/**
 * History query parameters
 */
export const HistoryQuerySchema = z.object({
  workspaceId: z.string().describe('Workspace ID to filter by'),
  status: ActionStatusSchema.optional().describe('Filter by status'),
  toolName: z.string().optional().describe('Filter by tool name'),
  category: ToolCategorySchema.optional().describe('Filter by category'),
  sessionId: z.string().optional().describe('Filter by session'),
  limit: z.number().min(1).max(100).optional().describe('Number of records (default: 50)'),
  offset: z.number().min(0).optional().describe('Offset for pagination (default: 0)'),
  sortBy: z.enum(['created_at', 'updated_at', 'status']).optional().describe('Sort field (default: created_at)'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
})

export type HistoryQuery = z.infer<typeof HistoryQuerySchema>

/**
 * Rollback request
 */
export const RollbackRequestSchema = z.object({
  actionId: z.string().describe('ID of the action to rollback'),
  reason: z.string().optional().describe('Reason for rollback'),
})

export type RollbackRequest = z.infer<typeof RollbackRequestSchema>

// =============================================================================
// WORK ITEM CREATION SCHEMAS (for creation tools)
// =============================================================================

/**
 * Work item creation parameters
 */
export const CreateWorkItemParamsSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  name: z.string().min(3).max(100).describe('Work item name'),
  type: z.enum(['concept', 'feature', 'bug', 'enhancement']).describe('Work item type'),
  purpose: z.string().max(500).optional().describe('Purpose/description'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Priority level (default: medium)'),
  tags: z.array(z.string()).max(5).optional().describe('Tags for categorization'),
  phase: z.enum(['research', 'planning', 'development', 'testing', 'complete']).optional().describe('Work item phase (default: research)'),
})

export type CreateWorkItemParams = z.infer<typeof CreateWorkItemParamsSchema>

/**
 * Task creation parameters
 */
export const CreateTaskParamsSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  workItemId: z.string().describe('Parent work item ID'),
  name: z.string().min(3).max(100).describe('Task name'),
  description: z.string().max(500).optional().describe('Task description'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Task priority (default: medium)'),
  assigneeId: z.string().optional().describe('Assignee user ID'),
  dueDate: z.string().optional().describe('Due date (ISO string)'),
})

export type CreateTaskParams = z.infer<typeof CreateTaskParamsSchema>

/**
 * Dependency creation parameters
 */
export const CreateDependencyParamsSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  sourceId: z.string().describe('Source work item ID'),
  targetId: z.string().describe('Target work item ID'),
  connectionType: z.enum(['dependency', 'blocks', 'complements', 'relates_to']).describe('Link type'),
  reason: z.string().max(300).optional().describe('Reason for the dependency'),
  strength: z.number().min(0).max(1).optional().describe('Dependency strength (default: 0.7)'),
})

export type CreateDependencyParams = z.infer<typeof CreateDependencyParamsSchema>

/**
 * Timeline item creation parameters
 */
export const CreateTimelineItemParamsSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  workItemId: z.string().describe('Parent work item ID'),
  name: z.string().min(3).max(100).describe('Timeline item name'),
  timeframe: z.enum(['mvp', 'short', 'long']).describe('Timeline category'),
  description: z.string().max(500).optional().describe('Description'),
  priority: z.number().min(1).max(100).optional().describe('Priority score (default: 50)'),
})

export type CreateTimelineItemParams = z.infer<typeof CreateTimelineItemParamsSchema>

/**
 * Customer insight creation parameters
 */
export const CreateInsightParamsSchema = z.object({
  workspaceId: z.string().describe('Workspace ID'),
  teamId: z.string().describe('Team ID'),
  title: z.string().min(3).max(100).describe('Insight title'),
  content: z.string().min(10).max(2000).describe('Insight content'),
  source: z.string().max(200).optional().describe('Source of the insight'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  tags: z.array(z.string()).max(5).optional().describe('Categorization tags'),
  linkedWorkItemId: z.string().optional().describe('Related work item ID'),
})

export type CreateInsightParams = z.infer<typeof CreateInsightParamsSchema>
