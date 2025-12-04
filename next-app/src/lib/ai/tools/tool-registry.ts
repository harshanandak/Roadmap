/**
 * Agentic Tool Registry
 *
 * Central registry for managing all AI tools in the agentic mode.
 * Provides:
 * - Tool registration with metadata
 * - Retrieval by name, category, or action type
 * - Type-safe tool definitions
 * - Tool discovery for AI suggestions
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Tool Registry                             │
 * │  ┌──────────────────────────────────────────────────────┐  │
 * │  │              Map<string, AgenticTool>                │  │
 * │  │                                                      │  │
 * │  │  Creation: createWorkItem, createTask, ...           │  │
 * │  │  Analysis: analyzeFeedback, suggestDependencies, ... │  │
 * │  │  Optimization: prioritizeFeatures, balanceWorkload.. │  │
 * │  │  Strategy: alignToStrategy, suggestOKRs, ...         │  │
 * │  └──────────────────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────┘
 */

import { tool } from 'ai'
import {
  ToolCategory,
  ActionType,
  EstimatedDuration,
  TOOL_CATEGORIES,
} from '../schemas/agentic-schemas'

// Get the return type of tool() function for proper typing
type AISDKTool = ReturnType<typeof tool>

// =============================================================================
// TYPES
// =============================================================================

/**
 * Example input for a tool to improve AI tool selection accuracy
 *
 * Based on Anthropic's "Tool Use Best Practices":
 * - Providing concrete examples improves accuracy from ~72% to ~90%
 * - Examples help the AI understand user intent and extract parameters correctly
 * - 2-4 examples per tool is optimal for most cases
 *
 * @example
 * ```typescript
 * const example: ToolExample = {
 *   description: 'User wants to report a login bug',
 *   userMessage: 'There is a bug where users get logged out randomly',
 *   input: {
 *     name: 'Random Session Logout Bug',
 *     type: 'bug',
 *     priority: 'high',
 *     purpose: 'Users experience unexpected logouts during normal usage'
 *   }
 * }
 * ```
 */
export interface ToolExample {
  /** Brief description of what the user is trying to do */
  description: string
  /** Example user message that would trigger this tool */
  userMessage: string
  /** Expected input parameters for this example */
  input: Record<string, unknown>
}

/**
 * Metadata attached to each tool for registry management and UI display
 */
export interface ToolMetadata {
  /** Unique tool identifier (camelCase, e.g., 'createWorkItem') */
  name: string
  /** Human-readable name (e.g., 'Create Work Item') */
  displayName: string
  /** Description shown to users and AI */
  description: string
  /** Tool category for organization */
  category: ToolCategory
  /** Whether user approval is required before execution */
  requiresApproval: boolean
  /** Whether the action can be undone */
  isReversible: boolean
  /** Type of action the tool performs */
  actionType: ActionType
  /** Expected execution time */
  estimatedDuration: EstimatedDuration
  /** Entity type this tool operates on (e.g., 'work_item', 'task') */
  targetEntity?: string
  /** Keywords for search/discovery */
  keywords?: string[]
  /**
   * Input examples to improve AI tool selection accuracy
   *
   * Provide 2-4 diverse examples showing how users might invoke this tool.
   * Include various parameter combinations and user intent patterns.
   */
  inputExamples?: ToolExample[]
}

/**
 * An AI SDK tool with attached metadata
 */
export type AgenticTool = AISDKTool & {
  metadata: ToolMetadata
}

/**
 * Tool filter options for retrieval
 */
export interface ToolFilter {
  category?: ToolCategory
  actionType?: ActionType
  requiresApproval?: boolean
  isReversible?: boolean
  targetEntity?: string
  keyword?: string
}

// =============================================================================
// REGISTRY CLASS
// =============================================================================

/**
 * Central registry for all agentic AI tools
 *
 * @example
 * ```typescript
 * // Register a tool
 * const createWorkItemTool = toolRegistry.register(
 *   tool({ ... }),
 *   {
 *     name: 'createWorkItem',
 *     displayName: 'Create Work Item',
 *     category: 'creation',
 *     requiresApproval: true,
 *     isReversible: true,
 *     actionType: 'create',
 *     estimatedDuration: 'fast',
 *   }
 * )
 *
 * // Retrieve tools
 * const creationTools = toolRegistry.getByCategory('creation')
 * const allTools = toolRegistry.getAll()
 * const tool = toolRegistry.get('createWorkItem')
 * ```
 */
class ToolRegistry {
  private tools = new Map<string, AgenticTool>()
  private byCategory = new Map<ToolCategory, Set<string>>()
  private byActionType = new Map<ActionType, Set<string>>()
  private byEntity = new Map<string, Set<string>>()

  /**
   * Register a new tool with metadata
   *
   * @param toolInstance - AI SDK tool created with `tool()`
   * @param metadata - Tool metadata for registry management
   * @returns The tool with metadata attached
   */
  register<T extends object>(toolInstance: T, metadata: ToolMetadata): T & { metadata: ToolMetadata } {
    // Validate metadata
    if (this.tools.has(metadata.name)) {
      console.warn(`[ToolRegistry] Tool "${metadata.name}" already registered. Overwriting.`)
    }

    // Create agentic tool with metadata
    const agenticTool = Object.assign(toolInstance, { metadata }) as T & { metadata: ToolMetadata }

    // Store in main registry
    this.tools.set(metadata.name, agenticTool as unknown as AgenticTool)

    // Index by category
    if (!this.byCategory.has(metadata.category)) {
      this.byCategory.set(metadata.category, new Set())
    }
    this.byCategory.get(metadata.category)!.add(metadata.name)

    // Index by action type
    if (!this.byActionType.has(metadata.actionType)) {
      this.byActionType.set(metadata.actionType, new Set())
    }
    this.byActionType.get(metadata.actionType)!.add(metadata.name)

    // Index by entity type
    if (metadata.targetEntity) {
      if (!this.byEntity.has(metadata.targetEntity)) {
        this.byEntity.set(metadata.targetEntity, new Set())
      }
      this.byEntity.get(metadata.targetEntity)!.add(metadata.name)
    }

    return agenticTool
  }

  /**
   * Get a tool by name
   */
  get(name: string): AgenticTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get a tool by name, throwing if not found
   */
  getOrThrow(name: string): AgenticTool {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }
    return tool
  }

  /**
   * Get all tools in a category
   */
  getByCategory(category: ToolCategory): AgenticTool[] {
    const names = this.byCategory.get(category) || new Set()
    return Array.from(names)
      .map(name => this.tools.get(name)!)
      .filter(Boolean)
  }

  /**
   * Get all tools by action type
   */
  getByActionType(actionType: ActionType): AgenticTool[] {
    const names = this.byActionType.get(actionType) || new Set()
    return Array.from(names)
      .map(name => this.tools.get(name)!)
      .filter(Boolean)
  }

  /**
   * Get all tools that operate on a specific entity type
   */
  getByEntity(entityType: string): AgenticTool[] {
    const names = this.byEntity.get(entityType) || new Set()
    return Array.from(names)
      .map(name => this.tools.get(name)!)
      .filter(Boolean)
  }

  /**
   * Get all tools matching a filter
   */
  filter(options: ToolFilter): AgenticTool[] {
    let tools = this.getAll()

    if (options.category) {
      tools = tools.filter(t => t.metadata.category === options.category)
    }

    if (options.actionType) {
      tools = tools.filter(t => t.metadata.actionType === options.actionType)
    }

    if (options.requiresApproval !== undefined) {
      tools = tools.filter(t => t.metadata.requiresApproval === options.requiresApproval)
    }

    if (options.isReversible !== undefined) {
      tools = tools.filter(t => t.metadata.isReversible === options.isReversible)
    }

    if (options.targetEntity) {
      tools = tools.filter(t => t.metadata.targetEntity === options.targetEntity)
    }

    if (options.keyword) {
      const keyword = options.keyword.toLowerCase()
      tools = tools.filter(t =>
        t.metadata.name.toLowerCase().includes(keyword) ||
        t.metadata.displayName.toLowerCase().includes(keyword) ||
        t.metadata.description.toLowerCase().includes(keyword) ||
        t.metadata.keywords?.some(k => k.toLowerCase().includes(keyword))
      )
    }

    return tools
  }

  /**
   * Get all registered tools
   */
  getAll(): AgenticTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get all tool names
   */
  getAllNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get all tool metadata (for UI listing)
   */
  getAllMetadata(): ToolMetadata[] {
    return this.getAll().map(t => t.metadata)
  }

  /**
   * Get tools requiring approval
   */
  getApprovalRequired(): AgenticTool[] {
    return this.filter({ requiresApproval: true })
  }

  /**
   * Get reversible tools (for undo support)
   */
  getReversible(): AgenticTool[] {
    return this.filter({ isReversible: true })
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get total number of registered tools
   */
  get size(): number {
    return this.tools.size
  }

  /**
   * Get category counts
   */
  getCategoryCounts(): Record<ToolCategory, number> {
    return {
      creation: this.byCategory.get('creation')?.size || 0,
      analysis: this.byCategory.get('analysis')?.size || 0,
      optimization: this.byCategory.get('optimization')?.size || 0,
      strategy: this.byCategory.get('strategy')?.size || 0,
    }
  }

  /**
   * Convert tools to AI SDK format (for passing to generateText/streamText)
   * Returns only the tool definitions without metadata
   */
  toAISDKFormat(filter?: ToolFilter): Record<string, AISDKTool> {
    const tools = filter ? this.filter(filter) : this.getAll()

    return tools.reduce(
      (acc, tool) => {
        // Remove metadata to get base tool
        const { metadata, ...baseTool } = tool as AgenticTool
        acc[metadata.name] = baseTool as AISDKTool
        return acc
      },
      {} as Record<string, AISDKTool>
    )
  }

  /**
   * Get tool descriptions with examples for system prompt injection
   *
   * This method formats tool metadata and examples in a way that helps
   * the AI model understand when and how to use each tool.
   *
   * @param filter - Optional filter to limit which tools to include
   * @returns Formatted string with tool descriptions and examples
   *
   * @example Output format:
   * ```
   * ## Available Tools
   *
   * ### createWorkItem (creation)
   * Create a new concept, feature, bug, or enhancement in the workspace
   *
   * Examples:
   * - User says: "Add a feature for dark mode"
   *   → Use with: { name: "Dark Mode Support", type: "feature", priority: "medium" }
   *
   * - User says: "There's a bug with login"
   *   → Use with: { name: "Login Bug", type: "bug", priority: "high" }
   * ```
   */
  getToolDescriptionsWithExamples(filter?: ToolFilter): string {
    const tools = filter ? this.filter(filter) : this.getAll()

    if (tools.length === 0) {
      return '## Available Tools\n\nNo tools available.'
    }

    const sections = tools.map(tool => {
      const meta = tool.metadata
      let section = `### ${meta.name} (${meta.category})\n${meta.description}`

      // Add keywords if present
      if (meta.keywords && meta.keywords.length > 0) {
        section += `\nKeywords: ${meta.keywords.join(', ')}`
      }

      // Add examples if present
      if (meta.inputExamples && meta.inputExamples.length > 0) {
        section += '\n\nExamples:'
        for (const example of meta.inputExamples) {
          section += `\n- ${example.description}`
          section += `\n  User says: "${example.userMessage}"`
          section += `\n  → Use with: ${JSON.stringify(example.input, null, 2).split('\n').join('\n  ')}`
        }
      }

      // Add approval/reversibility info
      const flags: string[] = []
      if (meta.requiresApproval) flags.push('requires approval')
      if (meta.isReversible) flags.push('reversible')
      if (flags.length > 0) {
        section += `\n[${flags.join(', ')}]`
      }

      return section
    })

    return `## Available Tools\n\n${sections.join('\n\n---\n\n')}`
  }

  /**
   * Get a compact version of tool examples for context-limited scenarios
   *
   * Returns just the tool names with their most representative example.
   * Useful when full descriptions would exceed token limits.
   */
  getToolExamplesCompact(): Record<string, { description: string; example?: string }> {
    const result: Record<string, { description: string; example?: string }> = {}

    for (const tool of this.getAll()) {
      const meta = tool.metadata
      const firstExample = meta.inputExamples?.[0]

      result[meta.name] = {
        description: meta.description,
        example: firstExample
          ? `"${firstExample.userMessage}" → ${JSON.stringify(firstExample.input)}`
          : undefined,
      }
    }

    return result
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear()
    this.byCategory.clear()
    this.byActionType.clear()
    this.byEntity.clear()
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global tool registry instance
 *
 * Import and use in tool definitions:
 * ```typescript
 * import { toolRegistry } from '@/lib/ai/tools/tool-registry'
 *
 * export const createWorkItemTool = toolRegistry.register(
 *   tool({ ... }),
 *   { name: 'createWorkItem', ... }
 * )
 * ```
 */
export const toolRegistry = new ToolRegistry()

// =============================================================================
// RE-EXPORT CONSTANTS
// =============================================================================

export { TOOL_CATEGORIES }
export type { ToolCategory, ActionType, EstimatedDuration }
