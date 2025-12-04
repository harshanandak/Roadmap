/**
 * Unified AI Chat API
 *
 * Chat-first AI endpoint that combines:
 * - Parallel AI tools (search, research, extraction)
 * - Agentic tools (create work items, analyze, optimize)
 *
 * The AI can freely converse AND execute actions via tools.
 * Agentic tools return confirmation requests that the frontend
 * displays for user approval before execution.
 *
 * Architecture:
 * User → useChat() → This Route → OpenRouter → AI Model
 *                                      ↓ (tool calls)
 *                    ┌─────────────────┴─────────────────┐
 *                    │                                   │
 *              Parallel AI APIs                  Agentic Tools
 *              (search, research)          (return confirmation requests)
 */

import { streamText, convertToCoreMessages, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { parallelAITools, parallelAIQuickTools } from '@/lib/ai/tools/parallel-ai-tools'
import { chatAgenticTools } from '@/lib/ai/tools/chat-agentic-tools'
import { toolRegistry } from '@/lib/ai/tools/tool-registry'
import { routeRequest, formatRoutingLog, type SessionState } from '@/lib/ai/session-router'
import { getDefaultModel } from '@/lib/ai/models-config'

// Import tool files to trigger registration (side-effects)
import '@/lib/ai/tools/creation-tools'
import '@/lib/ai/tools/analysis-tools'
import '@/lib/ai/tools/optimization-tools'
import '@/lib/ai/tools/strategy-tools'

export const maxDuration = 60

/**
 * Base system prompt for chat-first agentic AI
 */
const BASE_SYSTEM_PROMPT = `You are an AI assistant for the Product Lifecycle Platform. You help users with:
- Product planning, roadmaps, and feature management
- Creating work items, tasks, dependencies, and timeline breakdowns
- Analyzing feedback, identifying risks, and optimizing priorities
- Research, competitive analysis, and strategic planning

## Research Tools (execute immediately):
- webSearch: Search the web for current information
- extractContent: Extract content from URLs
- deepResearch: Comprehensive research on complex topics

## Guidelines

1. **Chat First**: Start with conversation. Ask clarifying questions if needed.

2. **Infer from Context**: When users say things like:
   - "Create a feature for user authentication" → Extract name="User Authentication", type="feature"
   - "Add a bug for the login issue" → Extract type="bug"
   - "This needs to be high priority" → Set priority="high"

3. **Show Confirmation**: For agentic tools, return the confirmation request.
   The frontend will display it for user approval.

4. **Be Helpful**: If you can't determine required parameters, ask the user.
   Never guess critical information like work item names.

5. **One Action at a Time**: Don't try to create multiple items in one message.
   Complete one confirmation, then proceed to the next if needed.`

/**
 * Get tool examples for system prompt injection
 *
 * Uses the tool registry to dynamically generate tool descriptions
 * with input examples that improve AI tool selection accuracy.
 *
 * Based on Anthropic's Tool Use Best Practices:
 * - Providing examples improves accuracy from ~72% to ~90%
 * - Examples help the AI understand user intent patterns
 */
function getToolExamplesForPrompt(): string {
  // Get examples from registered tools (creation, analysis, optimization, strategy)
  const toolDescriptions = toolRegistry.getToolDescriptionsWithExamples()

  if (!toolDescriptions || toolDescriptions === '## Available Tools\n\nNo tools available.') {
    return ''
  }

  return `\n\n## Agentic Tools (require user confirmation)\n${toolDescriptions}`
}

/**
 * Build the full system prompt with tool examples
 */
function buildUnifiedSystemPrompt(): string {
  return BASE_SYSTEM_PROMPT + getToolExamplesForPrompt()
}

/**
 * Build context-enhanced system prompt
 */
function buildSystemPrompt(
  basePrompt: string,
  workspaceContext?: {
    workspaceId?: string
    workspaceName?: string
    workspacePhase?: string
    teamId?: string
    currentWorkItems?: Array<{ id: string; name: string; type: string; status: string }>
  }
): string {
  if (!workspaceContext) return basePrompt

  const contextParts: string[] = []

  if (workspaceContext.workspaceName) {
    contextParts.push(`**Workspace**: ${workspaceContext.workspaceName}`)
  }
  if (workspaceContext.workspacePhase) {
    contextParts.push(`**Phase**: ${workspaceContext.workspacePhase}`)
  }
  if (workspaceContext.currentWorkItems && workspaceContext.currentWorkItems.length > 0) {
    const itemSummary = workspaceContext.currentWorkItems
      .slice(0, 15)
      .map((item) => `- [${item.id}] ${item.name} (${item.type}, ${item.status})`)
      .join('\n')
    contextParts.push(`**Work Items**:\n${itemSummary}`)
  }

  if (contextParts.length === 0) return basePrompt

  return `${basePrompt}

## Current Context
${contextParts.join('\n')}

Use the workspace ID "${workspaceContext.workspaceId}" and team ID "${workspaceContext.teamId}" when calling agentic tools.`
}

/**
 * Combine Parallel AI tools with Chat Agentic tools
 */
function getUnifiedTools(quickMode: boolean = false) {
  const researchTools = quickMode ? parallelAIQuickTools : parallelAITools

  return {
    ...researchTools,
    ...chatAgenticTools,
  }
}

/**
 * POST /api/ai/unified-chat
 *
 * Handles chat requests with both research and agentic tools.
 * Compatible with the AI SDK's useChat() hook.
 *
 * Request body:
 * - messages: UIMessage[] - Conversation history
 * - model?: string - Model key or 'auto' for intelligent routing (default: 'auto')
 * - quickMode?: boolean - Use only quick tools (default: false)
 * - systemPrompt?: string - Custom system prompt (merged with base)
 * - workspaceContext?: object - Context about current workspace
 * - session?: SessionState - Session state for model persistence
 *
 * Response headers:
 * - X-Session-State: JSON-encoded session state for client-side storage
 * - X-Model-Used: The model that was actually used for this request
 * - X-Routing-Reason: Why this model was selected
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      messages,
      model: modelInput,
      quickMode = false,
      systemPrompt: customSystemPrompt,
      workspaceContext,
      session,
    } = body as {
      messages: UIMessage[]
      model?: string
      quickMode?: boolean
      systemPrompt?: string
      workspaceContext?: {
        workspaceId?: string
        workspaceName?: string
        workspacePhase?: string
        teamId?: string
        currentWorkItems?: Array<{ id: string; name: string; type: string; status: string }>
      }
      session?: SessionState
    }

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 })
    }

    // Get unified tool set (needed before routing to check for tool use)
    const tools = getUnifiedTools(quickMode)
    const hasToolUse = Object.keys(tools).length > 0

    // Convert messages for routing
    const coreMessages = convertToCoreMessages(messages)

    // Route request through session router
    // Handles: user override, session persistence, context compaction, overflow
    const routingDecision = await routeRequest({
      messages: coreMessages,
      userModelKey: modelInput,
      session,
      hasToolUse,
    })

    // Log routing decision
    console.log(formatRoutingLog(routingDecision))

    // Build system prompt with dynamic tool examples
    const unifiedPrompt = buildUnifiedSystemPrompt()
    const basePrompt = customSystemPrompt
      ? `${unifiedPrompt}\n\n## Additional Instructions\n${customSystemPrompt}`
      : unifiedPrompt

    const fullSystemPrompt = buildSystemPrompt(basePrompt, workspaceContext)

    // Stream the response using the routed model and messages
    const result = streamText({
      model: routingDecision.languageModel,
      system: fullSystemPrompt,
      messages: routingDecision.messages, // May be compacted
      tools,
      onFinish({ text, toolCalls, toolResults, finishReason, usage }) {
        if (toolCalls && toolCalls.length > 0) {
          console.log('[Unified Chat] Tool calls:', toolCalls.map((t) => t.toolName))
        }
        if (usage) {
          console.log(`[Unified Chat] Usage: ${usage.inputTokens} in, ${usage.outputTokens} out`)
        }
      },
    })

    // Return response with session state in headers
    // AI SDK v5: Use toUIMessageStreamResponse() for useChat hook compatibility
    const response = result.toUIMessageStreamResponse()

    // Add routing metadata headers
    response.headers.set('X-Session-State', JSON.stringify(routingDecision.session))
    response.headers.set('X-Model-Used', routingDecision.model.displayName)
    response.headers.set('X-Routing-Reason', routingDecision.reason)

    if (routingDecision.compaction?.wasCompacted) {
      response.headers.set('X-Context-Compacted', 'true')
      response.headers.set('X-Messages-Summarized', String(routingDecision.compaction.summarizedCount))
    }

    return response
  } catch (error) {
    console.error('[Unified Chat] Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * GET /api/ai/unified-chat
 *
 * Returns information about the unified chat API.
 */
export async function GET() {
  const defaultModel = getDefaultModel()

  return Response.json({
    version: '2.0.0',
    name: 'Unified AI Chat',
    description: 'Chat-first AI with intelligent auto-routing, research, and agentic tools',
    provider: 'openrouter',
    routing: {
      default: 'auto',
      defaultModel: {
        key: defaultModel.key,
        name: defaultModel.displayName,
        modelId: defaultModel.modelId,
      },
      capabilities: ['default', 'large_context', 'tool_use', 'quality', 'cost_effective', 'speed', 'reasoning', 'realtime'],
      features: [
        'Session persistence - model stays consistent within a chat',
        'Context compaction - summarizes older messages at 80% of limit',
        'Overflow routing - switches to large_context model when needed',
        'Capability-based selection - routes by capability, not model name',
      ],
    },
    tools: {
      research: {
        webSearch: 'Search the web for current information',
        extractContent: 'Extract content from URLs',
        deepResearch: 'Comprehensive research on complex topics',
      },
      agentic: {
        creation: [
          'createWorkItem',
          'createTask',
          'createDependency',
          'createTimelineItem',
          'createInsight',
        ],
        analysis: [
          'analyzeFeedback',
          'suggestDependencies',
        ],
      },
    },
    features: [
      'Chat-first experience',
      'Intelligent auto-routing (default)',
      'Session model persistence',
      'Context compaction before overflow',
      'Natural language to tool parameters',
      'Confirmation before execution',
      'Research + agentic tools combined',
      'Workspace context awareness',
    ],
    responseHeaders: {
      'X-Session-State': 'JSON-encoded session state for client-side storage',
      'X-Model-Used': 'The model that was actually used for this request',
      'X-Routing-Reason': 'Why this model was selected',
      'X-Context-Compacted': 'Whether context was compacted (true/false)',
      'X-Messages-Summarized': 'Number of messages that were summarized',
    },
  })
}
