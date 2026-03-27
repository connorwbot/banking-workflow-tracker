import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens } from '@/lib/google/oauth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?error=missing_params`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Verify state matches user
  const expectedState = Buffer.from(user.id).toString('base64')
  if (state !== expectedState) {
    return NextResponse.redirect(`${origin}/settings?error=state_mismatch`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Use service client to write tokens (bypasses RLS for token storage)
    const serviceSupabase = await createServiceClient()
    await serviceSupabase
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token ?? undefined,
        google_token_expiry: expiry,
      })
      .eq('id', user.id)

    return NextResponse.redirect(`${origin}/settings?connected=true`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${origin}/settings?error=token_exchange_failed`)
  }
}
