/**
 * Public Workspace API Route
 *
 * GET /api/public/workspaces/[id]
 * Returns public workspace info for feedback pages.
 * Only returns data if public_feedback_enabled is true.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Query workspace with public fields only
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select(`
        id,
        name,
        icon,
        public_feedback_enabled,
        widget_settings,
        voting_settings
      `)
      .eq('id', id)
      .single()

    if (error || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Only return if public feedback is enabled
    if (!workspace.public_feedback_enabled) {
      return NextResponse.json(
        { error: 'Public feedback is not enabled for this workspace' },
        { status: 403 }
      )
    }

    // Return safe public data
    return NextResponse.json({
      data: {
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon,
        public_feedback_enabled: workspace.public_feedback_enabled,
        widget_settings: workspace.widget_settings,
        voting_settings: workspace.voting_settings,
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching public workspace:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
