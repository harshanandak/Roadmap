import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))

  try {
    const supabase = await createClient()

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
    }
  } catch (error) {
    console.error('Sign out failed:', error)
  }

  // Explicitly clear Supabase auth cookies on the response
  // This ensures cookies are deleted even if signOut() cookie propagation fails
  const supabaseCookies = request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith('sb-'))

  for (const cookie of supabaseCookies) {
    response.cookies.delete(cookie.name)
  }

  return response
}

export async function POST(request: NextRequest) {
  return GET(request)
}
