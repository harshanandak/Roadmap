/**
 * Vercel AI SDK Client with OpenRouter Provider
 *
 * Provides a unified interface for AI operations using the Vercel AI SDK
 * with OpenRouter as the provider layer. This enables:
 * - Access to 300+ models through single endpoint
 * - :nitro routing for maximum throughput
 * - Built-in streaming with `streamText()` / `generateText()`
 * - Tool calling for Parallel AI integration
 * - Type-safe structured output with Zod
 * - Built-in cost tracking via providerMetadata
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'

/**
 * OpenRouter client configuration
 * Uses the same API key as existing openrouter.ts implementation
 */
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  // Default headers for all requests
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Product Lifecycle Platform',
  },
})

/**
 * Default provider preferences for all models
 * data_collection: 'deny' excludes providers that may train on prompts
 * This ensures requests go to privacy-respecting providers only
 */
const defaultProviderSettings = {
  provider: {
    data_collection: 'deny' as const,
  },
}

/**
 * Pre-configured AI SDK models matching existing model IDs
 * All models use :nitro routing for 30-50% faster throughput
 * All models exclude data-collecting providers (China first-party endpoints)
 */
export const aiModels = {
  /**
   * Claude Haiku 4.5 (DEFAULT)
   * Best reasoning, fastest via nitro
   * Cost: $1.00/M input, $5.00/M output
   */
  claudeHaiku: openrouter('anthropic/claude-haiku-4.5:nitro', defaultProviderSettings),

  /**
   * Grok 4 Fast
   * Real-time reasoning, 2M context, fastest via nitro
   * Cost: $0.20/M input, $0.50/M output
   */
  grok4Fast: openrouter('x-ai/grok-4-fast:nitro', defaultProviderSettings),

  /**
   * Kimi K2 Thinking (CHEAPEST)
   * Deep reasoning with thinking traces
   * Cost: $0.15/M input, $2.50/M output
   * Note: data_collection: 'deny' excludes Moonshot's China endpoint
   */
  kimiK2: openrouter('moonshotai/kimi-k2-thinking:nitro', defaultProviderSettings),

  /**
   * DeepSeek V3.2 (NEW - Dec 2025)
   * GPT-5 level reasoning, thinking in tool-use
   * Cost: $0.28/M input, $0.40/M output
   * Context: 163K tokens
   * Note: data_collection: 'deny' excludes DeepSeek's China endpoint
   */
  deepseekV32: openrouter('deepseek/deepseek-v3.2:nitro', defaultProviderSettings),
} as const

/**
 * Model recommendations by use case
 */
export const recommendedModels = {
  /** Fast responses, real-time data (Grok 4) */
  speed: aiModels.grok4Fast,

  /** Best reasoning quality (Claude Haiku 4.5) */
  quality: aiModels.claudeHaiku,

  /** Lowest cost (Kimi K2) */
  cost: aiModels.kimiK2,

  /** Deep reasoning with thinking traces (Kimi K2) */
  thinking: aiModels.kimiK2,

  /** Default model for most tasks */
  default: aiModels.claudeHaiku,

  /** Agentic workflows with tool calling (DeepSeek V3.2 - thinking in tool-use) */
  agentic: aiModels.deepseekV32,

  /** Complex multi-step tasks (DeepSeek V3.2) */
  complex: aiModels.deepseekV32,
} as const

/**
 * Get model by key name
 */
export function getAIModel(
  key: keyof typeof aiModels
): LanguageModel {
  return aiModels[key]
}

/**
 * Get model by OpenRouter model ID
 * Supports dynamic model selection based on user preferences
 */
export function getModelById(modelId: string): LanguageModel {
  return openrouter(modelId)
}

/**
 * Model ID to AI SDK model mapping
 * Maps existing model IDs from models.ts to AI SDK models
 */
export const modelIdMap: Record<string, LanguageModel> = {
  'anthropic/claude-haiku-4.5:nitro': aiModels.claudeHaiku,
  'x-ai/grok-4-fast:nitro': aiModels.grok4Fast,
  'moonshotai/kimi-k2-thinking:nitro': aiModels.kimiK2,
  'deepseek/deepseek-v3.2:nitro': aiModels.deepseekV32,
}

/**
 * Get AI SDK model from existing AIModel interface
 * Bridges the gap between existing model config and AI SDK
 */
export function getModelFromConfig(modelId: string): LanguageModel {
  return modelIdMap[modelId] || openrouter(modelId)
}

/**
 * Type for AI SDK model keys
 */
export type AIModelKey = keyof typeof aiModels

/**
 * Type for recommended use cases
 */
export type AIUseCase = keyof typeof recommendedModels
