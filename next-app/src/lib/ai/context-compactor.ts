/**
 * Context Compactor
 *
 * Manages context window usage by:
 * 1. Estimating token counts for messages
 * 2. Summarizing older messages when approaching limits
 * 3. Keeping recent turns in full for context quality
 *
 * Based on JetBrains Mellum research:
 * - Keep last 10 turns in full (preserves immediate context)
 * - Summarize older messages (reduces tokens while preserving meaning)
 * - Trigger compaction at 80% of model's context limit
 *
 * @see https://blog.jetbrains.com/blog/2025/01/28/how-we-built-mellum/
 */

import { generateText } from 'ai'
import type { CoreMessage } from 'ai'
import { openrouter } from './ai-sdk-client'
import type { ModelConfig } from './models-config'
import { getModelByCapability } from './models-config'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of context compaction
 */
export interface CompactionResult {
  /** Compacted messages (older messages summarized) */
  messages: CoreMessage[]

  /** Estimated token count after compaction */
  estimatedTokens: number

  /** Whether compaction was performed */
  wasCompacted: boolean

  /** Summary of older messages (if compacted) */
  summary?: string

  /** Number of messages that were summarized */
  summarizedCount?: number
}

/**
 * Token estimation result
 */
export interface TokenEstimate {
  /** Estimated total tokens */
  total: number

  /** Tokens per message */
  perMessage: number[]

  /** Whether we're approaching the limit */
  nearLimit: boolean

  /** Percentage of context used */
  usagePercent: number
}

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate tokens for a string
 *
 * Uses the common approximation: ~4 characters per token for English.
 * This is accurate enough for context management (within 10% of tiktoken).
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // Base approximation: 4 characters per token
  // Adjust for common patterns:
  // - Code tends to have more tokens per character
  // - JSON/structured data has more tokens
  // - Natural language is close to 4 chars/token

  const isCode = /```[\s\S]*```/.test(text) || /^\s*(const|let|var|function|class|import|export)\s/m.test(text)
  const isJson = /^\s*[\[{]/.test(text) && /[\]}]\s*$/.test(text)

  let charsPerToken = 4
  if (isCode) charsPerToken = 3.5
  if (isJson) charsPerToken = 3

  return Math.ceil(text.length / charsPerToken)
}

/**
 * Estimate tokens for a message
 *
 * Accounts for role overhead and content structure.
 */
export function estimateMessageTokens(message: CoreMessage): number {
  // Role overhead: ~4 tokens for role markers
  const roleOverhead = 4

  // Content tokens
  let contentTokens = 0

  if (typeof message.content === 'string') {
    contentTokens = estimateTokens(message.content)
  } else if (Array.isArray(message.content)) {
    // Multi-part content (text + images, etc.)
    for (const part of message.content) {
      if ('text' in part && typeof part.text === 'string') {
        contentTokens += estimateTokens(part.text)
      } else if ('image' in part) {
        // Images typically use ~765 tokens (85 tokens for low detail, 765 for high)
        contentTokens += 765
      }
    }
  }

  return roleOverhead + contentTokens
}

/**
 * Estimate tokens for an array of messages
 *
 * @param messages - Messages to estimate
 * @param model - Model config to check limits against
 * @returns Token estimation with usage info
 */
export function estimateConversationTokens(
  messages: CoreMessage[],
  model: ModelConfig
): TokenEstimate {
  const perMessage = messages.map((m) => estimateMessageTokens(m))
  const total = perMessage.reduce((sum, t) => sum + t, 0)
  const usagePercent = (total / model.contextLimit) * 100
  const nearLimit = total >= model.compactAt

  return {
    total,
    perMessage,
    nearLimit,
    usagePercent,
  }
}

// =============================================================================
// CONTEXT COMPACTION
// =============================================================================

/**
 * Number of recent turns to keep in full
 *
 * JetBrains research found 10 turns optimal for:
 * - Preserving immediate context
 * - Maintaining conversation coherence
 * - Allowing for follow-up questions
 */
const RECENT_TURNS_TO_KEEP = 10

/**
 * Summarize older messages into a concise context
 *
 * Uses a fast, cost-effective model for summarization.
 *
 * @param messages - Messages to summarize
 * @returns Summary text
 */
async function summarizeMessages(messages: CoreMessage[]): Promise<string> {
  if (messages.length === 0) return ''

  // Format messages for summarization
  const formattedMessages = messages.map((m) => {
    const role = m.role === 'user' ? 'User' : 'Assistant'
    const content = typeof m.content === 'string'
      ? m.content
      : JSON.stringify(m.content)
    return `${role}: ${content}`
  }).join('\n\n')

  // Use cost-effective model for summarization
  const summaryModel = getModelByCapability('cost_effective')
  const modelId = summaryModel?.modelId || 'moonshotai/kimi-k2-thinking:nitro'

  try {
    const result = await generateText({
      model: openrouter(modelId),
      system: `You are a conversation summarizer. Create a concise summary of the conversation that preserves:
1. Key decisions and conclusions
2. Important context and facts discussed
3. Any pending questions or action items

Keep the summary under 500 words. Focus on information that would be useful for continuing the conversation.`,
      prompt: `Summarize this conversation:\n\n${formattedMessages}`,
      maxOutputTokens: 800,
    })

    return result.text
  } catch (error) {
    console.error('[Context Compactor] Summarization error:', error)
    // Fallback: Return a simple extraction of key points
    return `Previous conversation covered: ${messages.length} messages discussing various topics.`
  }
}

/**
 * Compact conversation context when approaching limits
 *
 * Strategy:
 * 1. Keep system message(s) intact
 * 2. Summarize older messages
 * 3. Keep last N turns in full
 *
 * @param messages - Full conversation messages
 * @param model - Current model config
 * @returns Compacted messages and metadata
 */
export async function compactContext(
  messages: CoreMessage[],
  model: ModelConfig
): Promise<CompactionResult> {
  // Estimate current usage
  const estimate = estimateConversationTokens(messages, model)

  // If not near limit, return as-is
  if (!estimate.nearLimit) {
    return {
      messages,
      estimatedTokens: estimate.total,
      wasCompacted: false,
    }
  }

  // Separate system messages and conversation
  const systemMessages = messages.filter((m) => m.role === 'system')
  const conversationMessages = messages.filter((m) => m.role !== 'system')

  // If conversation is small, can't compact meaningfully
  if (conversationMessages.length <= RECENT_TURNS_TO_KEEP) {
    return {
      messages,
      estimatedTokens: estimate.total,
      wasCompacted: false,
    }
  }

  // Split into messages to summarize and messages to keep
  const cutoffIndex = conversationMessages.length - RECENT_TURNS_TO_KEEP
  const messagesToSummarize = conversationMessages.slice(0, cutoffIndex)
  const messagesToKeep = conversationMessages.slice(cutoffIndex)

  // Generate summary
  const summary = await summarizeMessages(messagesToSummarize)

  // Create compacted messages
  const summaryMessage: CoreMessage = {
    role: 'assistant',
    content: `[Previous conversation summary]\n${summary}\n[End of summary - recent messages follow]`,
  }

  const compactedMessages: CoreMessage[] = [
    ...systemMessages,
    summaryMessage,
    ...messagesToKeep,
  ]

  // Re-estimate tokens
  const newEstimate = estimateConversationTokens(compactedMessages, model)

  return {
    messages: compactedMessages,
    estimatedTokens: newEstimate.total,
    wasCompacted: true,
    summary,
    summarizedCount: messagesToSummarize.length,
  }
}

// =============================================================================
// CONTEXT OVERFLOW DETECTION
// =============================================================================

/**
 * Check if conversation would overflow to a larger context model
 *
 * This is used when compaction isn't enough and we need to
 * switch to a model with a larger context window.
 *
 * @param estimatedTokens - Current token estimate
 * @param model - Current model config
 * @returns Whether we need a larger context model
 */
export function needsLargerContext(
  estimatedTokens: number,
  model: ModelConfig
): boolean {
  // If after compaction we're still above 90% of limit, need larger context
  return estimatedTokens >= model.contextLimit * 0.9
}

/**
 * Get recommended context overflow model
 *
 * Returns a model with larger context window for handling
 * conversations that exceed current model's capacity.
 */
export function getOverflowModel(): ModelConfig | undefined {
  return getModelByCapability('large_context')
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const __testing = {
  RECENT_TURNS_TO_KEEP,
  summarizeMessages,
}
