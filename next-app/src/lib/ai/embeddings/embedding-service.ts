/**
 * Embedding Service
 *
 * Generates vector embeddings for text chunks using OpenAI or Gemini.
 * Used for document RAG and semantic search.
 *
 * Architecture:
 * - Chunks text into ~500 token segments
 * - Batches API calls for efficiency
 * - Stores embeddings in pgvector
 */

import { EMBEDDING_CONFIG, type ChunkForEmbedding, type EmbeddingResult } from '@/lib/types/knowledge'

// =============================================================================
// TYPES
// =============================================================================

interface EmbeddingProvider {
  name: string
  model: string
  dimensions: number
  maxBatchSize: number
  maxTokensPerRequest: number
}

// =============================================================================
// PROVIDERS
// =============================================================================

const PROVIDERS: Record<string, EmbeddingProvider> = {
  openai: {
    name: 'OpenAI',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    maxBatchSize: 2048,
    maxTokensPerRequest: 8191,
  },
  gemini: {
    name: 'Gemini',
    model: 'text-embedding-004',
    dimensions: 768,
    maxBatchSize: 100,
    maxTokensPerRequest: 2048,
  },
}

// =============================================================================
// TEXT CHUNKING
// =============================================================================

/**
 * Simple token estimation (4 chars ≈ 1 token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Split text into chunks of approximately maxTokens
 */
export function chunkText(
  text: string,
  options: {
    maxTokens?: number
    overlap?: number
    minChunkSize?: number
  } = {}
): ChunkForEmbedding[] {
  const {
    maxTokens = EMBEDDING_CONFIG.maxTokensPerChunk,
    overlap = EMBEDDING_CONFIG.chunkOverlap,
    minChunkSize = EMBEDDING_CONFIG.minChunkSize,
  } = options

  const chunks: ChunkForEmbedding[] = []

  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/)

  let currentChunk = ''
  let currentIndex = 0
  let currentHeading = ''

  for (const paragraph of paragraphs) {
    // Check if this is a heading
    const headingMatch = paragraph.match(/^#+\s+(.+)$|^(.+)\n[=-]+$/m)
    if (headingMatch) {
      currentHeading = headingMatch[1] || headingMatch[2]
    }

    const paragraphTokens = estimateTokens(paragraph)

    // If paragraph alone exceeds max, split by sentences
    if (paragraphTokens > maxTokens) {
      // Save current chunk if not empty
      if (currentChunk.trim() && estimateTokens(currentChunk) >= minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          index: currentIndex++,
          heading: currentHeading || undefined,
          metadata: {},
        })
        currentChunk = ''
      }

      // Split paragraph by sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]

      for (const sentence of sentences) {
        if (estimateTokens(currentChunk + sentence) > maxTokens) {
          if (currentChunk.trim() && estimateTokens(currentChunk) >= minChunkSize) {
            chunks.push({
              content: currentChunk.trim(),
              index: currentIndex++,
              heading: currentHeading || undefined,
              metadata: {},
            })
          }
          // Keep overlap from previous chunk
          const overlapText = getOverlapText(currentChunk, overlap)
          currentChunk = overlapText + sentence
        } else {
          currentChunk += sentence
        }
      }
    } else {
      // Try to add paragraph to current chunk
      if (estimateTokens(currentChunk + '\n\n' + paragraph) > maxTokens) {
        // Save current chunk
        if (currentChunk.trim() && estimateTokens(currentChunk) >= minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            index: currentIndex++,
            heading: currentHeading || undefined,
            metadata: {},
          })
        }
        // Keep overlap from previous chunk
        const overlapText = getOverlapText(currentChunk, overlap)
        currentChunk = overlapText + paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim() && estimateTokens(currentChunk) >= minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      index: currentIndex,
      heading: currentHeading || undefined,
      metadata: {},
    })
  }

  return chunks
}

/**
 * Get the last N tokens worth of text for overlap
 */
function getOverlapText(text: string, overlapTokens: number): string {
  if (!text || overlapTokens <= 0) return ''

  const chars = overlapTokens * 4 // Approximate
  const words = text.split(/\s+/)
  const overlapWords: string[] = []
  let charCount = 0

  for (let i = words.length - 1; i >= 0 && charCount < chars; i--) {
    overlapWords.unshift(words[i])
    charCount += words[i].length + 1
  }

  return overlapWords.join(' ') + ' '
}

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embeddings for text chunks using OpenAI
 */
export async function generateEmbeddings(
  chunks: ChunkForEmbedding[],
  options: {
    provider?: 'openai' | 'gemini'
    apiKey?: string
  } = {}
): Promise<EmbeddingResult> {
  const { provider = 'openai' } = options
  const config = PROVIDERS[provider]

  if (!config) {
    throw new Error(`Unknown embedding provider: ${provider}`)
  }

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Embedding API key is required')
  }

  // Batch chunks to stay within limits
  const batches: ChunkForEmbedding[][] = []
  let currentBatch: ChunkForEmbedding[] = []
  let currentBatchTokens = 0

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.content)

    if (
      currentBatch.length >= config.maxBatchSize ||
      currentBatchTokens + chunkTokens > config.maxTokensPerRequest
    ) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch)
      }
      currentBatch = [chunk]
      currentBatchTokens = chunkTokens
    } else {
      currentBatch.push(chunk)
      currentBatchTokens += chunkTokens
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch)
  }

  // Generate embeddings for each batch
  const allResults: Array<{ index: number; embedding: number[]; tokenCount: number }> = []
  let totalTokens = 0

  for (const batch of batches) {
    const batchResults = await generateBatchEmbeddings(batch, config, apiKey)
    allResults.push(...batchResults.embeddings)
    totalTokens += batchResults.totalTokens
  }

  return {
    chunks: allResults,
    model: config.model,
    dimensions: config.dimensions,
    totalTokens,
  }
}

/**
 * Generate embeddings for a single batch
 */
async function generateBatchEmbeddings(
  chunks: ChunkForEmbedding[],
  config: EmbeddingProvider,
  apiKey: string
): Promise<{ embeddings: Array<{ index: number; embedding: number[]; tokenCount: number }>; totalTokens: number }> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: chunks.map((c) => c.content),
      dimensions: config.dimensions,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Embedding API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()

  const embeddings = data.data.map((item: { index: number; embedding: number[] }, i: number) => ({
    index: chunks[i].index,
    embedding: item.embedding,
    tokenCount: estimateTokens(chunks[i].content),
  }))

  return {
    embeddings,
    totalTokens: data.usage?.total_tokens || embeddings.reduce((sum: number, e: { tokenCount: number }) => sum + e.tokenCount, 0),
  }
}

// =============================================================================
// QUERY EMBEDDING
// =============================================================================

/**
 * Generate embedding for a search query
 */
export async function embedQuery(
  query: string,
  options: {
    provider?: 'openai' | 'gemini'
    apiKey?: string
  } = {}
): Promise<number[]> {
  const { provider = 'openai' } = options
  const config = PROVIDERS[provider]

  if (!config) {
    throw new Error(`Unknown embedding provider: ${provider}`)
  }

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Embedding API key is required')
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      input: query,
      dimensions: config.dimensions,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Embedding API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Format embedding array for pgvector
 */
export function formatEmbeddingForPgvector(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same dimension')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
