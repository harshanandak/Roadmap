import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { SupabaseClient, User } from '@supabase/supabase-js'

/** Result of ensuring user record exists */
type EnsureUserResult = { success: true } | { success: false; error: string }

/**
 * Ensures user record exists in public.users table.
 * Handles race condition where trigger may not have completed yet.
 */
async function ensureUserRecord(
  supabase: SupabaseClient,
  user: User
): Promise<EnsureUserResult> {
  // Check if user already exists
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  // Log unexpected errors (PGRST116 = "no rows found" is expected for new users)
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Failed to query user profile:', profileError)
  }

  // User already exists
  if (userProfile) {
    return { success: true }
  }

  // Cannot create user without email - required by users table
  if (!user.email) {
    return { success: false, error: 'missing_email' }
  }

  // Create user record only if it doesn't exist (handles trigger race condition)
  // Using insert + unique violation check because Supabase JS client doesn't support
  // ON CONFLICT DO NOTHING directly. Error code 23505 = unique_violation (safe to ignore)
  // We use insert instead of upsert to avoid overwriting user's customized profile name
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    })

  // 23505 = unique_violation (user already exists via trigger, which is fine)
  if (!insertError || insertError.code === '23505') {
    return { success: true }
  }

  console.error('Failed to create user record:', insertError)

  // Verify user exists (trigger may have succeeded)
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (verifyError && verifyError.code !== 'PGRST116') {
    console.error('Failed to verify user record:', verifyError)
  }

  return verifyUser
    ? { success: true }
    : { success: false, error: 'account_setup_failed' }
}

/**
 * Checks if user has team membership (completed onboarding).
 * Returns true on error to fail-safe (let dashboard handle errors).
 */
async function hasTeamMembership(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: teamMembers, error: teamError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .limit(1)

  if (teamError) {
    console.error('Failed to query team membership:', teamError)
    // Return false to redirect to onboarding on error
    // Dashboard also redirects to onboarding when query fails, so returning true
    // would create a redirect loop: callback → dashboard → onboarding → ...
    return false
  }

  return teamMembers.length > 0
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnTo = requestUrl.searchParams.get('returnTo')

  const supabase = await createClient()

  // Exchange auth code for session
  // Note: If no code is provided (e.g., direct navigation to /auth/callback),
  // we skip code exchange and check for existing session via getUser() below.
  // This safely handles both fresh auth flows and edge cases.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Failed to exchange code for session:', error)
      const errorUrl = new URL('/login', request.url)
      errorUrl.searchParams.set('error', 'invalid_code')
      // Don't preserve returnTo on auth errors - security measure
      // to prevent malicious returnTo from persisting through failed attempts
      return NextResponse.redirect(errorUrl)
    }
  }

  const { data: { user }, error: getUserError } = await supabase.auth.getUser()

  if (getUserError) {
    console.error('Failed to get user after code exchange:', getUserError)
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Ensure user record exists in public.users (must happen before any redirects)
  const userResult = await ensureUserRecord(supabase, user)
  if (!userResult.success) {
    // Sign out user to prevent middleware redirect loop
    // (authenticated user on /login would be redirected to /dashboard)
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error('Failed to sign out user after account setup failure:', signOutError)
    }

    const errorUrl = new URL('/login', request.url)
    errorUrl.searchParams.set('error', userResult.error)
    // Don't preserve returnTo on account setup errors - security measure
    // to prevent malicious returnTo from persisting through failed attempts
    return NextResponse.redirect(errorUrl)
  }

  // Handle returnTo redirect (e.g., from invitation acceptance)
  if (returnTo) {
    // Security: Validate returnTo is same-origin to prevent open redirects
    // This handles edge cases like /\evil.com that bypass simple startsWith checks
    try {
      const returnUrl = new URL(returnTo, request.url)
      if (returnUrl.origin !== new URL(request.url).origin) {
        console.error('Invalid returnTo parameter (different origin):', returnTo)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Only allow returnTo bypass for invitation acceptance path
      // This flow handles team joining itself
      const isInvitationPath = returnUrl.pathname.startsWith('/accept-invite')

      if (!isInvitationPath) {
        // For non-invitation paths, check team membership first
        // This prevents new users from bypassing onboarding with returnTo=/dashboard
        const hasTeam = await hasTeamMembership(supabase, user.id)
        if (!hasTeam) {
          // Preserve returnTo so user can continue after completing onboarding
          const onboardingUrl = new URL('/onboarding', request.url)
          onboardingUrl.searchParams.set('returnTo', returnTo)
          return NextResponse.redirect(onboardingUrl)
        }
      }

      return NextResponse.redirect(returnUrl)
    } catch (error) {
      // Distinguish URL parsing errors from other errors for better debugging
      if (error instanceof TypeError) {
        console.error('Invalid returnTo parameter (malformed URL):', returnTo)
      } else {
        console.error('Error processing returnTo redirect:', error)
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Check if user needs onboarding
  const hasTeam = await hasTeamMembership(supabase, user.id)
  if (!hasTeam) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
