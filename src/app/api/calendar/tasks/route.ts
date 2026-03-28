import { NextResponse } from 'next/server'
import { z } from 'zod'
import { addDays } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/token-refresh'
import { createEvent, deleteEvent, listEvents } from '@/lib/google/calendar'
import { scheduleTasksAroundEvents } from '@/lib/algorithms/task-scheduler'

const DEFAULT_PREFS = {
  work_day_start: '08:00',
  work_day_end: '22:00',
  timezone: 'America/New_York',
  protected_hours_enabled: true,
  protected_start_day: 5,
  protected_start_time: '19:00',
  protected_end_day: 6,
  protected_end_time: '10:00',
}

const PostSchema = z.object({
  days: z.number().int().min(1).max(14).optional(),
  due_within_days: z.number().int().min(1).max(30).optional(),
  task_ids: z.array(z.string().uuid()).optional(),
  overwrite: z.boolean().optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(Number(searchParams.get('days') ?? 7), 14)
  const dueWithinDays = Math.min(Number(searchParams.get('due_within_days') ?? 14), 30)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.google_access_token) {
    return NextResponse.json({ connected: false, schedule: [], unscheduled: [] })
  }

  const { data: prefsRow } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
  const prefs = { ...DEFAULT_PREFS, ...(prefsRow ?? {}) }

  const { data: tasks, error: tasksError } = await supabase
    .from('subtasks')
    .select('id,title,description,priority,due_date,due_time,expected_hours,project_id,gcal_event_id,status,project:projects(name,color)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .eq('status', 'open')

  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })

  const start = new Date().toISOString()
  const end = addDays(new Date(), days).toISOString()

  try {
    const token = await getValidAccessToken(supabase, profile)
    const events = await listEvents(token, profile.google_calendar_id ?? 'primary', start, end)

    const candidateTasks = (tasks ?? [])
      .filter((task) => !task.gcal_event_id)
      .filter((task) => {
        if (!task.due_date) return false
        const dueDate = new Date(`${task.due_date}T00:00:00`)
        const cutoff = addDays(new Date(), dueWithinDays)
        return dueDate <= cutoff
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_date,
        due_time: task.due_time,
        expected_hours: task.expected_hours != null ? Number(task.expected_hours) : null,
        project_id: task.project_id,
        project_name: (task.project as { name?: string } | null)?.name ?? null,
        project_color: (task.project as { color?: string } | null)?.color ?? null,
      }))

    const schedule = scheduleTasksAroundEvents(candidateTasks, events, prefs, days)
    const scheduledIds = new Set(schedule.map((slot) => slot.task_id))
    const unscheduled = candidateTasks.filter((task) => !scheduledIds.has(task.id))

    return NextResponse.json({ connected: true, schedule, unscheduled, due_within_days: dueWithinDays })
  } catch (error) {
    return NextResponse.json({ connected: true, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const days = parsed.data.days ?? 7
  const dueWithinDays = parsed.data.due_within_days ?? 14
  const overwrite = parsed.data.overwrite ?? false

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  const { data: prefsRow } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
  const prefs = { ...DEFAULT_PREFS, ...(prefsRow ?? {}) }

  const taskQuery = supabase
    .from('subtasks')
    .select('id,title,description,priority,due_date,due_time,expected_hours,project_id,gcal_event_id,status,project:projects(name,color)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .eq('status', 'open')

  const { data: tasks, error: tasksError } = parsed.data.task_ids?.length
    ? await taskQuery.in('id', parsed.data.task_ids)
    : await taskQuery

  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 })

  const start = new Date().toISOString()
  const end = addDays(new Date(), days).toISOString()

  try {
    const token = await getValidAccessToken(supabase, profile)
    const events = await listEvents(token, profile.google_calendar_id ?? 'primary', start, end)

    const candidateTasks = (tasks ?? [])
      .filter((task) => overwrite || !task.gcal_event_id)
      .filter((task) => {
        if (!task.due_date) return false
        const dueDate = new Date(`${task.due_date}T00:00:00`)
        const cutoff = addDays(new Date(), dueWithinDays)
        return dueDate <= cutoff
      })
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_date,
        due_time: task.due_time,
        expected_hours: task.expected_hours != null ? Number(task.expected_hours) : null,
        project_id: task.project_id,
        project_name: (task.project as { name?: string } | null)?.name ?? null,
        project_color: (task.project as { color?: string } | null)?.color ?? null,
      }))

    const schedule = scheduleTasksAroundEvents(candidateTasks, events, prefs, days)
    const byTaskId = new Map((tasks ?? []).map((task) => [task.id, task]))
    const created: Array<{ task_id: string; event_id: string; htmlLink?: string }> = []

    for (const slot of schedule) {
      const originalTask = byTaskId.get(slot.task_id)
      if (!originalTask) continue

      if (overwrite && originalTask.gcal_event_id) {
        await deleteEvent(token, profile.google_calendar_id ?? 'primary', originalTask.gcal_event_id)
      }

      const event = await createEvent(token, profile.google_calendar_id ?? 'primary', {
        summary: slot.project_name ? `${slot.project_name}: ${slot.title}` : slot.title,
        description: [originalTask.description, `Scheduled by Banking Workflow Tracker`, slot.reason]
          .filter(Boolean)
          .join('\n\n'),
        start: { dateTime: slot.start, timeZone: prefs.timezone },
        end: { dateTime: slot.end, timeZone: prefs.timezone },
        colorId: '9',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'popup', minutes: 30 },
          ],
        },
        extendedProperties: {
          private: {
            subtaskId: slot.task_id,
            projectId: slot.project_id,
            source: 'banking-workflow-tracker',
          },
        },
      })

      await supabase
        .from('subtasks')
        .update({ gcal_event_id: event.id, updated_at: new Date().toISOString() })
        .eq('id', slot.task_id)
        .eq('user_id', user.id)

      created.push({ task_id: slot.task_id, event_id: event.id, htmlLink: event.htmlLink })
    }

    return NextResponse.json({ scheduled: created, count: created.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
