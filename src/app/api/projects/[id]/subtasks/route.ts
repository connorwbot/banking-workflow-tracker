import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const SubtaskStatusSchema = z.enum(['open', 'waiting', 'blocked', 'done'])
const RecommendationFeedbackSchema = z.enum(['do_now', 'too_big', 'not_urgent', 'waiting_on_someone'])

const CreateSubtaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: SubtaskStatusSchema.optional(),
  recommendation_feedback: RecommendationFeedbackSchema.optional().nullable(),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  expected_hours: z.number().positive().max(100).optional().nullable(),
  owner_member_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional(),
  recurrence_template_id: z.string().uuid().optional().nullable(),
  delegated_by: z.array(z.string().uuid()).optional(),
})

const UpdateSubtaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: SubtaskStatusSchema.optional(),
  recommendation_feedback: RecommendationFeedbackSchema.optional().nullable(),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  expected_hours: z.number().positive().max(100).optional().nullable(),
  owner_member_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional(),
  recurrence_template_id: z.string().uuid().optional().nullable(),
  completed: z.boolean().optional(),
  delegated_by: z.array(z.string().uuid()).optional(),
})

function syncWorkflowFields(
  updates: Record<string, unknown>,
  extra: Record<string, unknown>
) {
  const status = updates.status as string | undefined
  const completed = updates.completed as boolean | undefined

  if (status === 'done') {
    extra.completed = true
    extra.completed_at = new Date().toISOString()
    return
  }

  if (status && status !== 'done') {
    extra.completed = false
    extra.completed_at = null
    return
  }

  if (completed === true) {
    extra.status = 'done'
    extra.completed_at = new Date().toISOString()
    return
  }

  if (completed === false) {
    extra.status = 'open'
    extra.completed_at = null
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await request.json()
  const parsed = CreateSubtaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const targetProjectId = parsed.data.project_id ?? projectId
  if (targetProjectId !== projectId) {
    const { data: targetProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', targetProjectId)
      .eq('user_id', user.id)
      .single()

    if (!targetProject) return NextResponse.json({ error: 'Target project not found' }, { status: 404 })
  }

  const insertPayload = {
    ...parsed.data,
    project_id: targetProjectId,
    user_id: user.id,
  } as Record<string, unknown>
  delete insertPayload.project_id
  insertPayload.project_id = targetProjectId

  const createExtra: Record<string, unknown> = {}
  syncWorkflowFields(insertPayload, createExtra)

  const { data, error } = await supabase
    .from('subtasks')
    .insert({ ...insertPayload, ...createExtra })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subtask: data }, { status: 201 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSubtaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, ...updates } = parsed.data
  const extra: Record<string, unknown> = { updated_at: new Date().toISOString() }
  syncWorkflowFields(updates as Record<string, unknown>, extra)

  if (updates.project_id) {
    const { data: targetProject } = await supabase
      .from('projects')
      .select('id')
      .eq('id', updates.project_id)
      .eq('user_id', user.id)
      .single()

    if (!targetProject) return NextResponse.json({ error: 'Target project not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('subtasks')
    .update({ ...updates, ...extra })
    .eq('id', id)
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subtask: data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const subtaskId = searchParams.get('subtaskId')
  if (!subtaskId) return NextResponse.json({ error: 'subtaskId required' }, { status: 400 })

  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId)
    .eq('project_id', projectId)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
