/**
 * Compression Job Status API
 *
 * GET    /api/knowledge/compression/[jobId] - Get job status
 * DELETE /api/knowledge/compression/[jobId] - Cancel job
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJobStatus, cancelJob } from '@/lib/ai/compression'

interface RouteContext {
  params: Promise<{ jobId: string }>
}

/**
 * GET /api/knowledge/compression/[jobId]
 *
 * Get the status of a compression job
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { jobId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job status
    const job = await getJobStatus(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user has access to this job's team
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', job.teamId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('[Compression Job API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/knowledge/compression/[jobId]
 *
 * Cancel a running compression job
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { jobId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job to verify access
    const job = await getJobStatus(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', job.teamId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Cancel the job
    const cancelled = await cancelJob(jobId)

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Job cannot be cancelled (may have already completed)' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled',
    })
  } catch (error) {
    console.error('[Compression Job API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    )
  }
}
