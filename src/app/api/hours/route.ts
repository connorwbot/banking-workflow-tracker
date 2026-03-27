import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0).max(24).nullable(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('standup_logs')
    .select('log_date, hours_worked')
    .eq('user_id', user.id)
    .not('hours_worked', 'is', null)
    .order('log_date', { ascending: true })

  if (from) query = query.gte('log_date', from)
  if (to) query = query.lte('log_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entries = (data ?? []).map((row) => ({
    date: row.log_date,
    hours: row.hours_worked != null ? Number(row.hours_worked) : null,
  }))

  return NextResponse.json({ entries })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { date, hours } = parsed.data

  const { data, error } = await supabase
    .from('standup_logs')
    .upsert(
      { user_id: user.id, log_date: date, hours_worked: hours, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,log_date' }
    )
    .select('log_date, hours_worked')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: { date: data.log_date, hours: data.hours_worked } })
}
