import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const returnTo = requestUrl.searchParams.get('returnTo')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Check if user has completed onboarding (has a team)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // If there's a returnTo parameter, redirect there (e.g., from invitation acceptance)
    if (returnTo) {
      return NextResponse.redirect(new URL(returnTo, request.url))
    }

    // Check if user exists in users table
    // Note: The database trigger (on_auth_user_created) runs asynchronously after auth.users insert
    // On serverless platforms like Vercel, the trigger may not complete before this code runs
    // So we explicitly create the user record if it doesn't exist
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!userProfile && user.email) {
      // Create user record explicitly (handles trigger race condition)
      // Only attempt if email exists - required by users table NOT NULL constraint
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        }, { onConflict: 'id' })

      if (upsertError) {
        console.error('Failed to create user record:', upsertError)
      }
    }

    // Check if user is a member of any team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!teamMember) {
      // User needs to create/join a team
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // User is fully onboarded, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // No user session, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
