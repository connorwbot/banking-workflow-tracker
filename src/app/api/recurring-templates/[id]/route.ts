import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  owner_member_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  cadence: z.enum(['daily', 'weekdays', 'weekly']).optional(),
  weekday: z.number().int().min(0).max(6).optional().nullable(),
  due_time: z.string().optional().nullable(),
  expected_hours: z.number().positive().max(100).optional().nullable(),
  active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    weekday:
      parsed.data.cadence === 'weekly'
        ? parsed.data.weekday ?? 1
        : parsed.data.cadence
          ? null
          : parsed.data.weekday,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('recurring_task_templates')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('recurring_task_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
