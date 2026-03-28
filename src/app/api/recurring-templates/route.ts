import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  owner_member_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  cadence: z.enum(['daily', 'weekdays', 'weekly']).default('weekdays'),
  weekday: z.number().int().min(0).max(6).optional().nullable(),
  due_time: z.string().optional().nullable(),
  expected_hours: z.number().positive().max(100).optional().nullable(),
  active: z.boolean().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('recurring_task_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const payload = {
    ...parsed.data,
    user_id: user.id,
    weekday: parsed.data.cadence === 'weekly' ? parsed.data.weekday ?? 1 : null,
  }

  const { data, error } = await supabase
    .from('recurring_task_templates')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
