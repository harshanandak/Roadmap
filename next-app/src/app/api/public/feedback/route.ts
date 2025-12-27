/**
 * Public Feedback Submission API Route
 *
 * POST /api/public/feedback
 * Accepts anonymous feedback submissions with spam protection.
 *
 * Security measures:
 * - Rate limiting (5 per hour per IP)
 * - Honeypot field detection
 * - Form timing validation
 * - Workspace public feedback validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { feedbackRateLimit, getClientIp, hashIp, createRateLimitHeaders } from '@/lib/security/rate-limit'
import { checkHoneypot } from '@/lib/security/honeypot'
import { z } from 'zod'

// Validation schema
const feedbackSchema = z.object({
  workspace_id: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  name: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  // Spam check fields
  website: z.string().optional(),
  _formLoadTime: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request.headers)

    // Check rate limit
    const rateLimitResult = feedbackRateLimit(clientIp)
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message },
        { status: 429, headers: rateLimitHeaders }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const parseResult = feedbackSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten() },
        { status: 400, headers: rateLimitHeaders }
      )
    }

    const data = parseResult.data

    // Check honeypot
    const spamCheck = checkHoneypot({
      honeypotValue: data.website,
      formLoadTime: data._formLoadTime,
      minSubmitTime: 3, // Minimum 3 seconds to fill form
    })

    if (spamCheck.isSpam) {
      // Log for monitoring but don't reveal to spammer
      console.warn('Spam detected:', {
        ip: hashIp(clientIp),
        reason: spamCheck.reason,
        confidence: spamCheck.confidence,
      })

      // Return success-like response to not tip off spammers
      return NextResponse.json({
        data: { id: 'submitted' },
        message: 'Feedback submitted successfully',
      }, { headers: rateLimitHeaders })
    }

    // Verify workspace exists and has public feedback enabled
    const supabase = await createClient()

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, team_id, public_feedback_enabled')
      .eq('id', data.workspace_id)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404, headers: rateLimitHeaders }
      )
    }

    if (!workspace.public_feedback_enabled) {
      return NextResponse.json(
        { error: 'Public feedback is not enabled for this workspace' },
        { status: 403, headers: rateLimitHeaders }
      )
    }

    // Create customer insight
    const insightId = Date.now().toString()
    const ipHash = hashIp(clientIp)

    const { data: insight, error: insertError } = await supabase
      .from('customer_insights')
      .insert({
        id: insightId,
        team_id: workspace.team_id,
        workspace_id: workspace.id,
        title: data.title,
        pain_point: data.description,
        source: 'feedback',
        sentiment: data.sentiment,
        status: 'new',
        customer_name: data.name || null,
        customer_email: data.email || null,
        submission_source: 'public_page',
        submission_ip_hash: ipHash,
        impact_score: 5, // Default impact
        tags: ['public-feedback'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating insight:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500, headers: rateLimitHeaders }
      )
    }

    return NextResponse.json({
      data: { id: insight.id },
      message: 'Feedback submitted successfully',
    }, { headers: rateLimitHeaders })
  } catch (error: unknown) {
    console.error('Public feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
