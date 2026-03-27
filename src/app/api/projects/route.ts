import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['pitch', 'live_deal', 'misc']),
  description: z.string().optional(),
  company_name: z.string().optional(),
  deal_size: z.number().optional(),
  due_date: z.string().optional(),
  color: z.string().optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create pipeline deal for pitches and live deals
  if (['pitch', 'live_deal'].includes(parsed.data.type)) {
    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .is('user_id', null)
      .eq('slug', 'pitching')
      .single()

    if (firstStage) {
      await supabase.from('pipeline_deals').insert({
        user_id: user.id,
        project_id: data.id,
        stage_id: firstStage.id,
      })
    }
  }

  return NextResponse.json({ project: data }, { status: 201 })
}
