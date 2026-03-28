import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { differenceInCalendarDays, format, parseISO, startOfDay, addDays } from 'date-fns'
import { ensureInboxProject, isInboxProject } from '@/lib/inbox'

type TaskRow = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'waiting' | 'blocked' | 'done'
  recommendation_feedback: 'do_now' | 'too_big' | 'not_urgent' | 'waiting_on_someone' | null
  due_date: string | null
  due_time: string | null
  expected_hours: number | null
  project_id: string
  owner_member_id: string | null
  recurrence_template_id: string | null
  owner_member_name: string | null
  project: {
    id: string
    name: string
    color: string
    type: string
    status: string
    due_date: string | null
  } | null
}

type RecurringTemplateRow = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  cadence: 'daily' | 'weekdays' | 'weekly'
  weekday: number | null
  due_time: string | null
  expected_hours: number | null
  active: boolean
  project_id: string | null
  owner_member_id: string | null
}

type ProjectRow = {
  id: string
  name: string
  type: string
  status: string
  due_date: string | null
  color: string
  sort_order: number
}

function compareTaskOrder(a: TaskRow, b: TaskRow) {
  const statusOrder = { open: 0, blocked: 1, waiting: 2, done: 3 } as const
  const statusCompare =
    (statusOrder[a.status as keyof typeof statusOrder] ?? 0) -
    (statusOrder[b.status as keyof typeof statusOrder] ?? 0)
  if (statusCompare !== 0) return statusCompare
  const aTime = a.due_time ?? '23:59'
  const bTime = b.due_time ?? '23:59'
  if (aTime !== bTime) return aTime.localeCompare(bTime)
  return a.title.localeCompare(b.title)
}

function priorityWeight(priority: TaskRow['priority']) {
  if (priority === 'urgent') return -4
  if (priority === 'high') return -2
  if (priority === 'low') return 1
  return 0
}

function effortWeight(expectedHours: number | null) {
  if (expectedHours === null || expectedHours === undefined) return 0
  if (expectedHours <= 1) return -3
  if (expectedHours <= 2) return -2
  if (expectedHours <= 4) return -1
  if (expectedHours >= 8) return 2
  return 0
}

function formatHours(hours: number | null) {
  if (hours === null || hours === undefined) return ''
  const rounded = Number.isInteger(hours) ? hours.toString() : hours.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded}h`
}

function statusWeight(status: TaskRow['status']) {
  if (status === 'blocked') return 4
  if (status === 'waiting') return 6
  return 0
}

function feedbackWeight(feedback: TaskRow['recommendation_feedback']) {
  if (feedback === 'do_now') return -5
  if (feedback === 'too_big') return 3
  if (feedback === 'not_urgent') return 4
  if (feedback === 'waiting_on_someone') return 6
  return 0
}

function matchesCadence(template: RecurringTemplateRow, dayOfWeek: number) {
  if (template.cadence === 'daily') return true
  if (template.cadence === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
  if (template.cadence === 'weekly') return template.weekday === dayOfWeek
  return false
}

function cadenceLabel(template: RecurringTemplateRow) {
  if (template.cadence === 'daily') return 'Daily'
  if (template.cadence === 'weekdays') return 'Weekdays'
  return 'Weekly'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const in7 = format(addDays(now, 7), 'yyyy-MM-dd')
  const todayStart = startOfDay(now)

  const [tasksRes, projectsRes, recurringRes, standupRes, recurringTodayRes] = await Promise.all([
    supabase
      .from('subtasks')
      .select('id,title,description,priority,status,recommendation_feedback,due_date,due_time,expected_hours,project_id,owner_member_id,recurrence_template_id,project:projects(id,name,color,type,status,due_date)')
      .eq('user_id', user.id)
      .eq('completed', false),
    supabase
      .from('projects')
      .select('id,name,type,status,due_date,color,sort_order')
      .eq('user_id', user.id)
      .in('status', ['active', 'on_hold'])
      .order('sort_order', { ascending: true }),
    supabase
      .from('recurring_task_templates')
      .select('id,title,description,priority,cadence,weekday,due_time,expected_hours,active,project_id,owner_member_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('standup_logs')
      .select('id, log_date, worked_on, blockers, wins, tomorrow_plan, hours_worked')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle(),
    supabase
      .from('subtasks')
      .select('id, title, status, project_id, recurrence_template_id, due_date')
      .eq('user_id', user.id)
      .eq('due_date', today)
      .not('recurrence_template_id', 'is', null),
  ])

  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 })
  if (projectsRes.error) return NextResponse.json({ error: projectsRes.error.message }, { status: 500 })
  if (recurringRes.error) return NextResponse.json({ error: recurringRes.error.message }, { status: 500 })
  if (standupRes.error) return NextResponse.json({ error: standupRes.error.message }, { status: 500 })
  if (recurringTodayRes.error) return NextResponse.json({ error: recurringTodayRes.error.message }, { status: 500 })

  const { data: members } = await supabase
    .from('team_members')
    .select('id, name')
    .eq('user_id', user.id)

  const memberMap = Object.fromEntries((members ?? []).map((member) => [member.id, member.name]))
  const inboxProject = await ensureInboxProject(supabase, user.id)

  const tasks = (tasksRes.data ?? []) as TaskRow[]
  const projects = (projectsRes.data ?? []) as ProjectRow[]
  const recurringTemplates = (recurringRes.data ?? []) as RecurringTemplateRow[]
  const recurringTodayTasks = (recurringTodayRes.data ?? []) as Pick<TaskRow, 'id' | 'title' | 'status' | 'project_id' | 'recurrence_template_id' | 'due_date'>[]
  const visibleProjects = projects.filter((project) => !isInboxProject(project))

  const enrichedTasks = tasks.map((task) => ({
    ...task,
    owner_member_name: task.owner_member_id ? memberMap[task.owner_member_id] ?? null : null,
  }))

  const inboxTasks = enrichedTasks
    .filter((task) => task.project_id === inboxProject.id)
    .sort(compareTaskOrder)

  const nonInboxTasks = enrichedTasks.filter((task) => task.project_id !== inboxProject.id)

  const overdueTasks = nonInboxTasks
    .filter((task) => task.due_date && task.due_date < today)
    .sort(compareTaskOrder)

  const todayTasks = nonInboxTasks
    .filter((task) => task.due_date === today)
    .sort(compareTaskOrder)

  const upcomingTasks = nonInboxTasks
    .filter((task) => task.due_date && task.due_date > today && task.due_date <= in7)
    .sort((a, b) => {
      if (a.due_date !== b.due_date) return (a.due_date ?? '').localeCompare(b.due_date ?? '')
      return compareTaskOrder(a, b)
    })

  const dayOfWeek = now.getDay()
  const recurringForToday = recurringTemplates
    .filter((template) => matchesCadence(template, dayOfWeek))
    .map((template) => {
      const todayTask = recurringTodayTasks.find((task) => task.recurrence_template_id === template.id && task.due_date === today) ?? null
      return {
        ...template,
        cadence_label: cadenceLabel(template),
        today_task: todayTask
          ? {
              id: todayTask.id,
              title: todayTask.title,
              status: todayTask.status,
              project_id: todayTask.project_id,
            }
          : null,
      }
    })

  const projectWork = visibleProjects.map((project) => {
    const projectTasks = nonInboxTasks.filter((task) => task.project_id === project.id)
    const actionableTasks = projectTasks.filter((task) => task.status === 'open')
    const dueSoonTasks = actionableTasks.filter((task) => task.due_date && task.due_date <= in7 && task.due_date >= today)
    const nextTaskPool = actionableTasks.length > 0 ? actionableTasks : projectTasks
    const nextTask = [...nextTaskPool].sort((a, b) => {
      if (!a.due_date && !b.due_date) return compareTaskOrder(a, b)
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
      return compareTaskOrder(a, b)
    })[0] ?? null

    const projectDueIn = project.due_date ? differenceInCalendarDays(parseISO(project.due_date), todayStart) : null
    const nextDueIn = nextTask?.due_date ? differenceInCalendarDays(parseISO(nextTask.due_date), todayStart) : null
    const referenceDays = projectDueIn ?? nextDueIn ?? 999
    const holdPenalty = project.status === 'on_hold' ? 20 : 0
    const nextTaskEffort = nextTask?.expected_hours ?? null
    const score =
      referenceDays +
      holdPenalty -
      Math.min(dueSoonTasks.length, 5) * 2 +
      priorityWeight(nextTask?.priority ?? 'medium') +
      effortWeight(nextTaskEffort) +
      statusWeight(nextTask?.status ?? 'open') +
      feedbackWeight(nextTask?.recommendation_feedback ?? null)
    const recommendation_reason = (() => {
      if (project.status === 'on_hold') return 'On hold'
      if (nextTask?.recommendation_feedback === 'do_now') return 'Pinned as do now'
      if (nextTask?.recommendation_feedback === 'too_big') return 'Flagged as too big'
      if (nextTask?.recommendation_feedback === 'not_urgent') return 'Marked not urgent'
      if (nextTask?.status === 'waiting' || nextTask?.recommendation_feedback === 'waiting_on_someone') return 'Waiting on someone'
      if (nextTask?.status === 'blocked') return 'Blocked right now'
      if (projectDueIn !== null && projectDueIn <= 0) return 'Due now'
      if (nextTaskEffort !== null && nextTaskEffort <= 2 && nextDueIn !== null && nextDueIn <= 3) {
        return `Quick win: ${formatHours(nextTaskEffort)} due in ${Math.max(nextDueIn, 0)} day${nextDueIn === 1 ? '' : 's'}`
      }
      if (projectDueIn !== null && projectDueIn <= 3) return `Due in ${Math.max(projectDueIn, 0)} day${projectDueIn === 1 ? '' : 's'}`
      if (nextDueIn !== null && nextDueIn <= 3) return `Next task in ${Math.max(nextDueIn, 0)} day${nextDueIn === 1 ? '' : 's'}`
      if (nextTaskEffort !== null && nextTaskEffort <= 2) return `Fast next action: ${formatHours(nextTaskEffort)}`
      if (nextTaskEffort !== null && nextTaskEffort >= 8) return `Heavy lift: ${formatHours(nextTaskEffort)}`
      if (dueSoonTasks.length > 0) return `${dueSoonTasks.length} task${dueSoonTasks.length === 1 ? '' : 's'} due soon`
      return 'Good next project'
    })()

    return {
      ...project,
      open_task_count: projectTasks.length,
      due_soon_task_count: dueSoonTasks.length,
      next_task: nextTask
        ? {
            id: nextTask.id,
            title: nextTask.title,
            due_date: nextTask.due_date,
            due_time: nextTask.due_time,
            expected_hours: nextTask.expected_hours,
            status: nextTask.status,
            priority: nextTask.priority,
          }
        : null,
      project_due_in: projectDueIn,
      next_due_in: nextDueIn,
      recommendation_reason,
      score,
    }
  }).sort((a, b) => a.score - b.score)

  return NextResponse.json({
    date: today,
    inbox_project: inboxProject,
    summary: {
      overdue_count: overdueTasks.length,
      due_today_count: todayTasks.length,
      upcoming_count: upcomingTasks.length,
      project_count: projectWork.length,
    },
    overdue_tasks: overdueTasks,
    today_tasks: todayTasks,
    upcoming_tasks: upcomingTasks,
    inbox_tasks: inboxTasks,
    project_work: projectWork,
    projects: visibleProjects,
    capture_projects: [inboxProject, ...visibleProjects],
    recurring_templates: recurringForToday,
    review: {
      standup_done: Boolean(standupRes.data?.worked_on || standupRes.data?.blockers || standupRes.data?.wins || standupRes.data?.tomorrow_plan),
      hours_logged: standupRes.data?.hours_worked != null,
      hours_worked: standupRes.data?.hours_worked ?? null,
    },
  })
}
