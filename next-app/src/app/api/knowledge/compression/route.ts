/**
 * Knowledge Compression API
 *
 * POST /api/knowledge/compression - Trigger compression job
 * GET  /api/knowledge/compression - List compression jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runCompressionJob, listJobs } from '@/lib/ai/compression'
import type { CompressionJobType, CompressionJobStatus } from '@/lib/types/collective-intelligence'

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
    const validJobTypes: CompressionJobType[] = ['l2_summary', 'l3_clustering', 'l4_extraction', 'full_refresh']
    if (!jobType || !validJobTypes.includes(jobType)) {
      return NextResponse.json(
        { error: `Invalid job type. Must be one of: ${validJobTypes.join(', ')}` },
        { status: 400 }
      )
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
