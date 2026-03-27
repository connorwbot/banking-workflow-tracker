import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  log_date: z.string(),
  worked_on: z.string().optional().nullable(),
  blockers: z.string().optional().nullable(),
  wins: z.string().optional().nullable(),
  tomorrow_plan: z.string().optional().nullable(),
  mood_score: z.number().min(1).max(5).optional().nullable(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const limit = Number(searchParams.get('limit') ?? 30)

  if (date) {
    const { data } = await supabase
      .from('standup_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .single()
    return NextResponse.json({ log: data ?? null })
  }

  const { data } = await supabase
    .from('standup_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(limit)

  return NextResponse.json({ logs: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('standup_logs')
    .upsert({ ...parsed.data, user_id: user.id }, { onConflict: 'user_id,log_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
