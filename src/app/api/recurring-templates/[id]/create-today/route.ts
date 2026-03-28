import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { ensureInboxProject } from '@/lib/inbox'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: template, error: templateError } = await supabase
    .from('recurring_task_templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (templateError || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: existing } = await supabase
    .from('subtasks')
    .select('id, project_id')
    .eq('user_id', user.id)
    .eq('recurrence_template_id', id)
    .eq('due_date', today)
    .maybeSingle()

  if (existing) return NextResponse.json({ task: existing })

  const inboxProject = await ensureInboxProject(supabase, user.id)
  const targetProjectId = template.project_id ?? inboxProject.id

  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      user_id: user.id,
      project_id: targetProjectId,
      recurrence_template_id: template.id,
      title: template.title,
      description: template.description,
      priority: template.priority,
      status: 'open',
      due_date: today,
      due_time: template.due_time,
      expected_hours: template.expected_hours,
      owner_member_id: template.owner_member_id,
    })
    .select('id, project_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data }, { status: 201 })
}
