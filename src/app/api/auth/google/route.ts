import { createClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/google/oauth'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use user's session ID as state to verify on callback
  const state = Buffer.from(user.id).toString('base64')
  const url = buildOAuthUrl(state)

  return NextResponse.redirect(url)
}
