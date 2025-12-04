/**
 * Document Search API
 *
 * POST /api/documents/search
 *
 * Semantic search across knowledge base using vector embeddings.
 * Returns relevant document chunks ranked by similarity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embedQuery, formatEmbeddingForPgvector } from '@/lib/ai/embeddings/embedding-service'
import type { DocumentSearchResult, SearchDocumentsRequest, SearchDocumentsResponse } from '@/lib/types/knowledge'

/**
 * POST /api/documents/search
 *
 * Request body:
 * - query: Search query text (required)
 * - workspaceId: Filter by workspace (optional)
 * - collectionId: Filter by collection (optional)
 * - limit: Max results (default: 10)
 * - threshold: Min similarity score 0-1 (default: 0.7)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (memberError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const teamId = membership.team_id

    // Parse request
    const body = await request.json() as SearchDocumentsRequest
    const {
      query,
      workspaceId,
      collectionId,
      limit = 10,
      threshold = 0.7,
    } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    if (query.length > 1000) {
      return NextResponse.json({ error: 'Query too long. Max 1000 characters.' }, { status: 400 })
    }

    // Generate query embedding
    const queryEmbedding = await embedQuery(query)

    // Search using pgvector
    const { data: results, error: searchError } = await supabase.rpc('search_documents', {
      p_team_id: teamId,
      p_query_embedding: formatEmbeddingForPgvector(queryEmbedding),
      p_workspace_id: workspaceId || null,
      p_collection_id: collectionId || null,
      p_limit: Math.min(limit, 50), // Cap at 50
      p_threshold: Math.max(0.5, Math.min(threshold, 1.0)), // Clamp between 0.5 and 1.0
    })

    if (searchError) {
      console.error('[Document Search] Search error:', searchError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Transform results
    const searchResults: DocumentSearchResult[] = (results || []).map((row: {
      chunk_id: string
      document_id: string
      document_name: string
      content: string
      similarity: number
      page_number?: number
      heading?: string
    }) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentName: row.document_name,
      content: row.content,
      similarity: Math.round(row.similarity * 1000) / 1000, // Round to 3 decimals
      pageNumber: row.page_number,
      heading: row.heading,
    }))

    const durationMs = Date.now() - startTime

    // Log query for analytics (async, don't await)
    const queryId = Date.now().toString()
    supabase
      .from('document_queries')
      .insert({
        id: queryId,
        team_id: teamId,
        workspace_id: workspaceId,
        user_id: user.id,
        query_text: query,
        result_count: searchResults.length,
        result_chunk_ids: searchResults.map((r) => r.chunkId),
        result_scores: searchResults.map((r) => r.similarity),
        duration_ms: durationMs,
      })
      .then(({ error }) => {
        if (error) console.error('[Document Search] Query log error:', error)
      })

    const response: SearchDocumentsResponse = {
      results: searchResults,
      queryId,
      durationMs,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Document Search] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/documents/search
 *
 * Returns search API info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Document Search API',
    method: 'POST',
    description: 'Semantic search across knowledge base using vector embeddings',
    requestBody: {
      query: 'string (required) - Search query text',
      workspaceId: 'string (optional) - Filter by workspace',
      collectionId: 'string (optional) - Filter by collection',
      limit: 'number (optional, default: 10, max: 50) - Max results',
      threshold: 'number (optional, default: 0.7, range: 0.5-1.0) - Min similarity',
    },
    response: {
      results: 'Array of matching document chunks with similarity scores',
      queryId: 'string - Unique query ID for tracking',
      durationMs: 'number - Search duration in milliseconds',
    },
    example: {
      query: 'How do we handle user authentication?',
      workspaceId: 'ws123',
      limit: 5,
      threshold: 0.75,
    },
  })
}
