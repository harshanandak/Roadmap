/**
 * Model-Agnostic Configuration
 *
 * This is the ONLY file to change when adding/removing/updating models.
 * The rest of the platform uses capabilities, not model names.
 *
 * Architecture:
 * - Platform logic requests capabilities (e.g., 'large_context')
 * - This registry returns the appropriate model
 * - OpenRouter handles provider routing, failover, and rate limiting
 *
 * @see https://openrouter.ai/docs for provider-level features
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Model capabilities for routing decisions
 *
 * Platform code should request capabilities, NOT specific models.
 * This ensures the platform remains model-agnostic.
 */
export type ModelCapability =
  | 'default' // The default model for new sessions
  | 'large_context' // Can handle >500K tokens (for overflow fallback)
  | 'tool_use' // Excels at tool calling / agentic workflows
  | 'quality' // Premium quality responses
  | 'cost_effective' // Optimized for cost
  | 'speed' // Optimized for speed / low latency
  | 'reasoning' // Deep reasoning capability
  | 'realtime' // Real-time data access

/**
 * Provider configuration
 *
 * Currently OpenRouter only, but designed for future multi-provider support.
 */
export type ModelProvider = 'openrouter'

/**
 * Complete model configuration
 *
 * Each model declares its capabilities, limits, and costs.
 * The router uses this to make intelligent decisions.
 */
export interface ModelConfig {
  /** Unique identifier (used in session state, NOT the model ID) */
  key: string

  /** Provider for this model */
  provider: ModelProvider

  /** Provider-specific model ID (e.g., 'anthropic/claude-haiku-4.5:nitro') */
  modelId: string

  /** Display name for UI */
  displayName: string

  /** Emoji icon for UI */
  icon: string

  /** What this model is good at */
  capabilities: ModelCapability[]

  /** Maximum context window in tokens */
  contextLimit: number

  /** Trigger context compacting at this token count (typically 80% of limit) */
  compactAt: number

  /** Cost per 1M tokens (USD) */
  costPer1M: {
    input: number
    output: number
  }

  /** Is this the default model for new sessions? */
  isDefault?: boolean

  /** Provider-specific settings (passed to OpenRouter) */
  providerSettings?: Record<string, unknown>
}

// =============================================================================
// MODEL REGISTRY
// =============================================================================

/**
 * Central Model Registry
 *
 * To add a new model:
 * 1. Add entry here with capabilities
 * 2. That's it! The platform auto-discovers it.
 *
 * To remove a model:
 * 1. Remove the entry (or comment out)
 * 2. Ensure another model has 'default' capability
 *
 * To change the default:
 * 1. Set `isDefault: true` on the new default
 * 2. Remove `isDefault` from the old default
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Kimi K2 Thinking - CHEAPEST, good reasoning
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'kimi-k2',
    provider: 'openrouter',
    modelId: 'moonshotai/kimi-k2-thinking:nitro',
    displayName: 'Kimi K2 Thinking',
    icon: '🧠',
    capabilities: ['default', 'cost_effective', 'reasoning'],
    contextLimit: 262_000,
    compactAt: 210_000, // 80% of 262K
    costPer1M: { input: 0.15, output: 2.5 },
    isDefault: true,
    providerSettings: { data_collection: 'deny' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DeepSeek V3.2 - Best for tool use / agentic workflows
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'deepseek-v3',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-v3.2:nitro',
    displayName: 'DeepSeek V3.2',
    icon: '🔮',
    capabilities: ['tool_use', 'reasoning'],
    contextLimit: 163_000,
    compactAt: 130_000, // 80% of 163K
    costPer1M: { input: 0.28, output: 0.4 },
    providerSettings: { data_collection: 'deny' },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Grok 4 Fast - LARGEST context (2M), real-time data
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'grok-4',
    provider: 'openrouter',
    modelId: 'x-ai/grok-4-fast:nitro',
    displayName: 'Grok 4 Fast',
    icon: '🚀',
    capabilities: ['large_context', 'speed', 'realtime'],
    contextLimit: 2_000_000,
    compactAt: 1_600_000, // 80% of 2M
    costPer1M: { input: 0.2, output: 0.5 },
    // No data_collection setting - xAI doesn't train on API data
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Claude Haiku 4.5 - Premium quality
  // ─────────────────────────────────────────────────────────────────────────
  {
    key: 'claude-haiku',
    provider: 'openrouter',
    modelId: 'anthropic/claude-haiku-4.5:nitro',
    displayName: 'Claude Haiku 4.5',
    icon: '⚡',
    capabilities: ['quality', 'reasoning'],
    contextLimit: 200_000,
    compactAt: 160_000, // 80% of 200K
    costPer1M: { input: 1.0, output: 5.0 },
    // Anthropic doesn't train on API data by default
  },
]

// =============================================================================
// HELPER FUNCTIONS (Capability-Based, NOT Model-Based)
// =============================================================================

/**
 * Get the default model for new sessions
 *
 * Usage:
 * ```typescript
 * const model = getDefaultModel()
 * // Returns: Kimi K2 (cheapest, isDefault: true)
 * ```
 */
export function getDefaultModel(): ModelConfig {
  return MODEL_REGISTRY.find((m) => m.isDefault) || MODEL_REGISTRY[0]
}

/**
 * Get model by its unique key
 *
 * Usage:
 * ```typescript
 * const model = getModelByKey('grok-4')
 * // Returns: Grok 4 config
 * ```
 */
export function getModelByKey(key: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.key === key)
}

/**
 * Get first model with a specific capability
 *
 * Usage:
 * ```typescript
 * const model = getModelByCapability('large_context')
 * // Returns: Grok 4 (2M context)
 * ```
 *
 * This is the primary API for model selection.
 * Platform code should request capabilities, NOT specific models.
 */
export function getModelByCapability(capability: ModelCapability): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.capabilities.includes(capability))
}

/**
 * Get all models with a specific capability
 *
 * Usage:
 * ```typescript
 * const reasoningModels = getModelsByCapability('reasoning')
 * // Returns: [Kimi K2, DeepSeek V3, Claude Haiku]
 * ```
 */
export function getModelsByCapability(capability: ModelCapability): ModelConfig[] {
  return MODEL_REGISTRY.filter((m) => m.capabilities.includes(capability))
}

/**
 * Get all available models (for UI model selector)
 */
export function getAllModels(): ModelConfig[] {
  return MODEL_REGISTRY
}

/**
 * Get all model keys (for type-safe usage)
 */
export function getAllModelKeys(): string[] {
  return MODEL_REGISTRY.map((m) => m.key)
}

// =============================================================================
// UI HELPERS
// =============================================================================

/**
 * Model options for UI dropdowns
 *
 * Includes "Auto" option at the top for smart selection.
 */
export interface ModelOption {
  id: string
  name: string
  description: string
  icon: string
}

/**
 * Get model options for UI model selector
 *
 * Returns models formatted for dropdown, with "Auto" at the top.
 */
export function getModelOptionsForUI(): ModelOption[] {
  const autoOption: ModelOption = {
    id: 'auto',
    name: 'Auto',
    description: 'Smart selection (recommended)',
    icon: '🤖',
  }

  const modelOptions: ModelOption[] = MODEL_REGISTRY.map((m) => ({
    id: m.key,
    name: m.displayName,
    description: `${Math.round(m.contextLimit / 1000)}K context`,
    icon: m.icon,
  }))

  return [autoOption, ...modelOptions]
}

// =============================================================================
// COST HELPERS
// =============================================================================

/**
 * Calculate estimated cost for a request
 */
export function calculateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * model.costPer1M.input
  const outputCost = (outputTokens / 1_000_000) * model.costPer1M.output
  return inputCost + outputCost
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`
  }
  return `$${cost.toFixed(4)}`
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ModelKey = (typeof MODEL_REGISTRY)[number]['key']
