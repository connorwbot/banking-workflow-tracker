import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('sort_order', { ascending: true })

  const { data: deals } = await supabase
    .from('pipeline_deals')
    .select('*, project:projects(*), stage:pipeline_stages(*)')
    .eq('user_id', user.id)

  return NextResponse.json({ stages: stages ?? [], deals: deals ?? [] })
}
