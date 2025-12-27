/**
 * L2 Document Summarizer
 *
 * Generates compressed document summaries (~200 tokens) with:
 * - Main summary text
 * - Key points (5-7 bullet points)
 * - Topics/themes detected
 * - Named entities (people, products, technologies)
 * - Document type classification
 * - Sentiment analysis
 * - Complexity score
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createClient } from '@/lib/supabase/server'
import { formatEmbeddingForPgvector, embedQuery } from '../embeddings/embedding-service'
import type {
  DocumentSummary,
  DocumentSummaryInsert,
  DocumentType,
  Sentiment,
} from '@/lib/types/collective-intelligence'

// =============================================================================
// SCHEMAS
// =============================================================================

const DocumentSummarySchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the document in 2-3 sentences (max 200 tokens)'),
  keyPoints: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe('The 3-7 most important points or takeaways from the document'),
  topics: z
    .array(z.string())
    .max(5)
    .describe('Main topics or themes covered (e.g., "user authentication", "API design")'),
  entities: z
    .array(z.string())
    .max(10)
    .describe('Named entities: people, products, companies, technologies mentioned'),
  documentType: z
    .enum([
      'prd',
      'meeting_notes',
      'research',
      'spec',
      'design',
      'feedback',
      'decision',
      'announcement',
      'other',
    ])
    .describe('The type/category of this document'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative', 'mixed'])
    .describe('Overall sentiment of the document'),
  complexityScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Complexity score from 0 (simple) to 1 (very complex/technical)'),
})

type _GeneratedSummary = z.infer<typeof DocumentSummarySchema>

// =============================================================================
// SUMMARIZER
// =============================================================================

export interface SummarizeDocumentOptions {
  documentId: string
  documentName: string
  content: string
  existingTopics?: string[] // Context: existing topics in the workspace
  model?: string
}

export interface SummarizeDocumentResult {
  success: boolean
  summaryId?: string
  summary?: DocumentSummary
  tokensUsed?: number
  error?: string
}

/**
 * Generate an L2 summary for a document
 */
export async function summarizeDocument(
  options: SummarizeDocumentOptions
): Promise<SummarizeDocumentResult> {
  const {
    documentId,
    documentName,
    content,
    existingTopics = [],
    model = 'anthropic/claude-3-haiku-20240307',
  } = options

  try {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    // Truncate content if too long (keep first ~8000 chars for context)
    const truncatedContent = content.length > 8000 ? content.slice(0, 8000) + '...' : content

    // Build context about existing topics
    const topicContext =
      existingTopics.length > 0
        ? `\n\nExisting topics in this workspace for reference: ${existingTopics.join(', ')}`
        : ''

    // Generate summary using AI
    const { object: generated, usage } = await generateObject({
      model: openrouter(model),
      schema: DocumentSummarySchema,
      prompt: `Analyze this document and generate a structured summary.

Document Name: ${documentName}

Document Content:
${truncatedContent}
${topicContext}

Generate a comprehensive but concise summary that captures the essence of this document.
Focus on actionable insights and key decisions.`,
    })

    // Generate embedding for the summary
    const summaryEmbedding = await embedQuery(generated.summary)

    // Store in database
    const supabase = await createClient()

    const summaryInsert: DocumentSummaryInsert = {
      documentId,
      summary: generated.summary,
      keyPoints: generated.keyPoints,
      topics: generated.topics,
      entities: generated.entities,
      documentType: generated.documentType as DocumentType,
      sentiment: generated.sentiment as Sentiment,
      complexityScore: generated.complexityScore,
      embedding: summaryEmbedding,
      modelUsed: model,
      tokenCount: Math.ceil(generated.summary.length / 4),
    }

    // Delete existing summary if any
    await supabase.from('document_summaries').delete().eq('document_id', documentId)

    // Insert new summary
    const { data: inserted, error: insertError } = await supabase
      .from('document_summaries')
      .insert({
        document_id: summaryInsert.documentId,
        summary: summaryInsert.summary,
        key_points: summaryInsert.keyPoints,
        topics: summaryInsert.topics,
        entities: summaryInsert.entities,
        document_type: summaryInsert.documentType,
        sentiment: summaryInsert.sentiment,
        complexity_score: summaryInsert.complexityScore,
        embedding: formatEmbeddingForPgvector(summaryInsert.embedding!),
        model_used: summaryInsert.modelUsed,
        token_count: summaryInsert.tokenCount,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to store summary: ${insertError.message}`)
    }

    // Transform to camelCase
    const summary: DocumentSummary = {
      id: inserted.id,
      documentId: inserted.document_id,
      summary: inserted.summary,
      keyPoints: inserted.key_points || [],
      topics: inserted.topics || [],
      entities: inserted.entities || [],
      documentType: inserted.document_type,
      sentiment: inserted.sentiment,
      complexityScore: inserted.complexity_score,
      embedding: null, // Don't return embedding to client
      modelUsed: inserted.model_used,
      tokenCount: inserted.token_count,
      generatedAt: inserted.generated_at,
      qualityScore: inserted.quality_score,
      feedbackCount: inserted.feedback_count,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    }

    return {
      success: true,
      summaryId: inserted.id,
      summary,
      tokensUsed: usage?.totalTokens,
    }
  } catch (error) {
    console.error('[L2 Summarizer] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to summarize document',
    }
  }
}

/**
 * Batch summarize multiple documents
 */
export async function batchSummarizeDocuments(
  documents: Array<{ documentId: string; documentName: string; content: string }>,
  existingTopics: string[] = [],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  successful: number
  failed: number
  results: SummarizeDocumentResult[]
}> {
  const results: SummarizeDocumentResult[] = []
  let successful = 0
  let failed = 0

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]

    const result = await summarizeDocument({
      documentId: doc.documentId,
      documentName: doc.documentName,
      content: doc.content,
      existingTopics,
    })

    results.push(result)

    if (result.success) {
      successful++
      // Add new topics to context for subsequent documents
      if (result.summary?.topics) {
        existingTopics.push(...result.summary.topics.filter((t) => !existingTopics.includes(t)))
      }
    } else {
      failed++
    }

    onProgress?.(i + 1, documents.length)

    // Small delay to avoid rate limiting
    if (i < documents.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return { successful, failed, results }
}

/**
 * Get summary for a document
 */
export async function getDocumentSummary(documentId: string): Promise<DocumentSummary | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('document_summaries')
    .select('*')
    .eq('document_id', documentId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    documentId: data.document_id,
    summary: data.summary,
    keyPoints: data.key_points || [],
    topics: data.topics || [],
    entities: data.entities || [],
    documentType: data.document_type,
    sentiment: data.sentiment,
    complexityScore: data.complexity_score,
    embedding: null,
    modelUsed: data.model_used,
    tokenCount: data.token_count,
    generatedAt: data.generated_at,
    qualityScore: data.quality_score,
    feedbackCount: data.feedback_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
