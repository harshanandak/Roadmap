/**
 * AI SDK Tools Index
 *
 * Re-exports all AI SDK tool definitions for easy importing.
 */

// Parallel AI tools (web search, content extraction, research)
export {
  webSearchTool,
  extractContentTool,
  deepResearchTool,
  researchStatusTool,
  quickAnswerTool,
  parallelAITools,
  parallelAIQuickTools,
  parallelAIResearchTools,
} from './parallel-ai-tools'

// Tool registry for agentic mode
export {
  toolRegistry,
  TOOL_CATEGORIES,
  type AgenticTool,
  type ToolMetadata,
  type ToolFilter,
} from './tool-registry'

// Creation tools (work items, tasks, dependencies, timelines, insights)
export * from './creation-tools'

// Analysis tools (feedback, dependencies, gaps, summaries, requirements)
export * from './analysis-tools'

// Optimization tools (prioritize, balance, risks, timeline, deduplicate)
export * from './optimization-tools'

// Strategy tools (alignment, OKRs, competitive analysis, roadmap, impact)
export * from './strategy-tools'
