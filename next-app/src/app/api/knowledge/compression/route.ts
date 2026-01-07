/**
 * Knowledge Compression API
 *
 * POST /api/knowledge/compression - Trigger compression job
 * GET  /api/knowledge/compression - List compression jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runCompressionJob, listJobs } from '@/lib/ai/compression'
import { embedMindMap } from '@/lib/ai/embeddings/mindmap-embedding-service'
import type { CompressionJobType, CompressionJobStatus } from '@/lib/types/collective-intelligence'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * POST /api/knowledge/compression
 *
 * Trigger a compression job
 *
 * Request body:
 * - jobType: 'l2_summary' | 'l3_clustering' | 'l4_extraction' | 'full_refresh'
 * - workspaceId: Optional workspace scope
 * - documentIds: Optional specific documents to process
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const {
      jobType,
      workspaceId,
      documentIds,
    } = body as {
      jobType: CompressionJobType
      workspaceId?: string
      documentIds?: string[]
    }

    // Validate job type
    const validJobTypes: CompressionJobType[] = ['l2_summary', 'l3_clustering', 'l4_extraction', 'full_refresh', 'mindmap_embed']
    if (!jobType || !validJobTypes.includes(jobType)) {
      return NextResponse.json(
        { error: `Invalid job type. Must be one of: ${validJobTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Handle mindmap_embed job type separately
    if (jobType === 'mindmap_embed') {
      const result = await runMindmapEmbedJob(supabase, teamId, workspaceId, user.id)
      return NextResponse.json({
        job: result,
        message: `Mind map embedding job completed: ${result.processed} processed, ${result.failed} failed`,
      }, { status: 200 })
    }

    // Run the compression job (async - returns immediately with job status)
    const job = await runCompressionJob({
      teamId,
      workspaceId,
      jobType,
      documentIds,
      triggeredBy: user.id,
    })

    return NextResponse.json({
      job,
      message: `Compression job started: ${jobType}`,
    }, { status: 202 })
  } catch (error) {
    console.error('[Compression API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start compression job' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/knowledge/compression
 *
 * List compression jobs
 *
 * Query params:
 * - workspaceId: Filter by workspace
 * - status: Filter by status
 * - limit: Max results (default: 20)
 */
export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || undefined
    const status = searchParams.get('status') as CompressionJobStatus | undefined
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get jobs
    const jobs = await listJobs(teamId, {
      workspaceId,
      status,
      limit: Math.min(limit, 100),
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('[Compression API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to list compression jobs' },
      { status: 500 }
    )
  }
}

// =============================================================================
// MINDMAP EMBEDDING JOB
// =============================================================================

interface MindmapEmbedJobResult {
  type: 'mindmap_embed'
  teamId: string
  workspaceId?: string
  processed: number
  failed: number
  skipped: number
  status: 'completed' | 'failed'
  startedAt: string
  completedAt: string
  errors: string[]
}

/**
 * Run mind map embedding job for pending mind maps
 * Processes up to 10 mind maps per invocation
 */
async function runMindmapEmbedJob(
  supabase: SupabaseClient,
  teamId: string,
  workspaceId: string | undefined,
  _triggeredBy: string
): Promise<MindmapEmbedJobResult> {
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  let processed = 0
  let failed = 0
  let skipped = 0

  try {
    // Find mind maps that need embedding
    let query = supabase
      .from('mind_maps')
      .select('id, name')
      .eq('team_id', teamId)
      .in('embedding_status', ['pending', 'error'])
      .not('blocksuite_tree', 'is', null)
      .limit(10)

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data: mindMaps, error: queryError } = await query

    if (queryError) {
      throw new Error(`Failed to query mind maps: ${queryError.message}`)
    }

    if (!mindMaps || mindMaps.length === 0) {
      return {
        type: 'mindmap_embed',
        teamId,
        workspaceId,
        processed: 0,
        failed: 0,
        skipped: 0,
        status: 'completed',
        startedAt,
        completedAt: new Date().toISOString(),
        errors: [],
      }
    }

    // Process each mind map using the embedding service directly
    // This avoids HTTP requests and uses the authenticated Supabase client
    for (const mindMap of mindMaps) {
      try {
        // Call embedding service directly with authenticated client
        const result = await embedMindMap(supabase, mindMap.id, { force: false })

        if (!result.success) {
          throw new Error(result.error || 'Embedding failed')
        }

        if (result.reason === 'unchanged' || result.reason === 'empty' || result.reason === 'no_chunks') {
          skipped++
        } else {
          processed++
        }

        console.log(`[MindmapEmbed] Processed ${mindMap.name}: ${result.chunks || 0} chunks`)
      } catch (error) {
        failed++
        const message = `Failed to embed ${mindMap.name}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(message)
        console.error(`[MindmapEmbed] ${message}`)
      }
    }

    return {
      type: 'mindmap_embed',
      teamId,
      workspaceId,
      processed,
      failed,
      skipped,
      status: failed > 0 && processed === 0 ? 'failed' : 'completed',
      startedAt,
      completedAt: new Date().toISOString(),
      errors,
    }
  } catch (error) {
    return {
      type: 'mindmap_embed',
      teamId,
      workspaceId,
      processed,
      failed,
      skipped,
      status: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : String(error)],
    }
  }
}
