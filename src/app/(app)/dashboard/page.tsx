'use client'

import type { ComponentType } from 'react'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { Header } from '@/components/layout/Header'
import { QuickCaptureModal } from '@/components/today/QuickCaptureModal'
import { TaskTriageModal } from '@/components/today/TaskTriageModal'
import { RecurringTemplateModal } from '@/components/today/RecurringTemplateModal'
import { dueDateLabel, formatTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  FolderKanban,
  ListTodo,
  Plus,
  Repeat,
  Timer,
} from 'lucide-react'
import type { PriorityLevel, SubtaskStatus, RecommendationFeedback } from '@/types/database'

type TodayTask = {
  id: string
  title: string
  description: string | null
  priority: PriorityLevel
  status: SubtaskStatus
  recommendation_feedback: RecommendationFeedback | null
  due_date: string | null
  due_time: string | null
  expected_hours: number | null
  project_id: string
  owner_member_id?: string | null
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

type ProjectWork = {
  id: string
  name: string
  type: string
  status: string
  due_date: string | null
  color: string
  open_task_count: number
  due_soon_task_count: number
  next_task: {
    id: string
    title: string
    due_date: string | null
    due_time: string | null
    expected_hours: number | null
    status: SubtaskStatus
    priority: PriorityLevel
  } | null
  project_due_in: number | null
  next_due_in: number | null
  recommendation_reason: string
}

type TodayItem = {
  kind: 'task' | 'project'
  id: string
  title: string
  due_date: string
  due_time?: string | null
  project_name?: string
  project_color?: string
  priority?: PriorityLevel
}

type TodayData = {
  date: string
  inbox_project: { id: string; name: string; color: string; status: string } | null
  summary: {
    overdue_count: number
    due_today_count: number
    upcoming_count: number
    project_count: number
  }
  overdue_tasks: TodayTask[]
  today_tasks: TodayTask[]
  upcoming_tasks: TodayTask[]
  inbox_tasks: TodayTask[]
  project_work: ProjectWork[]
  projects: { id: string; name: string; color: string; status: string }[]
  capture_projects: { id: string; name: string; color: string; status: string }[]
  recurring_templates: {
    id: string
    title: string
    cadence_label: string
    due_time: string | null
    expected_hours: number | null
    today_task: {
      id: string
      title: string
      status: SubtaskStatus
      project_id: string
    } | null
  }[]
  review: {
    standup_done: boolean
    hours_logged: boolean
    hours_worked: number | null
  }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function priorityVariant(priority?: PriorityLevel) {
  if (priority === 'urgent') return 'red' as const
  if (priority === 'high') return 'orange' as const
  if (priority === 'medium') return 'blue' as const
  return 'gray' as const
}

function statusVariant(status: SubtaskStatus) {
  if (status === 'blocked') return 'red' as const
  if (status === 'waiting') return 'orange' as const
  if (status === 'done') return 'green' as const
  return 'gray' as const
}

function formatHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined) return ''
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(2).replace(/\.?0+$/, '')}h`
}

function TaskRow({
  task,
  onComplete,
  onEdit,
  onDefer,
}: {
  task: TodayTask
  onComplete: (task: TodayTask) => void
  onEdit: (task: TodayTask) => void
  onDefer: (task: TodayTask) => void
}) {
  const dateLabel = task.due_date ? dueDateLabel(task.due_date) : ''
  const dueTime = task.due_time ? formatTime(`${task.due_date ?? format(new Date(), 'yyyy-MM-dd')}T${task.due_time}:00`) : ''
  const dueLabel = dueTime && dateLabel ? `${dateLabel} at ${dueTime}` : (dueTime || dateLabel)
  const overdue = task.due_date ? task.due_date < format(new Date(), 'yyyy-MM-dd') : false

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div
        className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: task.project?.color ?? '#94a3b8' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
            <p className="truncate text-xs text-slate-500">
              {task.project?.name ?? 'No project'}
            </p>
          </div>
          <button
            onClick={() => onComplete(task)}
            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-600"
            title="Mark complete"
          >
            <Check size={14} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
          <Badge variant={statusVariant(task.status)}>{task.status}</Badge>
          {dueLabel ? (
            <span className={cn('text-xs', overdue ? 'font-medium text-red-500' : 'text-slate-500')}>
              {dueLabel}
            </span>
          ) : null}
          {task.expected_hours != null && (
            <span className="text-xs text-slate-500">Est. {formatHours(task.expected_hours)}</span>
          )}
          {task.owner_member_name && (
            <span className="text-xs text-slate-500">Belongs to {task.owner_member_name}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => onEdit(task)}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDefer(task)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Tomorrow
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectCardRow({
  project,
  onFeedback,
}: {
  project: ProjectWork
  onFeedback: (project: ProjectWork, feedback: RecommendationFeedback) => void
}) {
  const nextTaskTime = project.next_task?.due_date && project.next_task?.due_time
    ? formatTime(`${project.next_task.due_date}T${project.next_task.due_time}:00`)
    : ''
  const nextTaskHoursLabel = formatHours(project.next_task?.expected_hours)
  const nextTaskDue = project.next_task?.due_date
    ? `${dueDateLabel(project.next_task.due_date)}${nextTaskTime ? ` at ${nextTaskTime}` : ''}`
    : project.project_due_in !== null
      ? `${project.project_due_in}d`
      : 'No deadline'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/projects/${project.id}`} className="truncate font-medium text-slate-900 hover:text-blue-700">
                {project.name}
              </Link>
              <p className="text-xs text-slate-500">
                {project.open_task_count} open task{project.open_task_count === 1 ? '' : 's'}
              </p>
            </div>
            <Badge variant={project.status === 'on_hold' ? 'gray' : 'green'}>
              {project.status.replace('_', ' ')}
            </Badge>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-400">Next action</p>
              <p className="truncate text-sm text-slate-700">
                {project.next_task?.title ?? 'Define the next move'}
              </p>
              {nextTaskHoursLabel && (
                <p className="text-xs text-slate-400">Est. {nextTaskHoursLabel}</p>
              )}
            </div>
            <span className="flex-shrink-0 text-xs text-slate-500">{nextTaskDue}</span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {project.recommendation_reason}
          </p>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              <ArrowRight size={12} /> {project.due_soon_task_count} due soon
            </span>
            {project.project_due_in !== null && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-1',
                project.project_due_in <= 3 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              )}>
                <CalendarDays size={12} />
                {project.project_due_in <= 0 ? 'Due now' : `${project.project_due_in}d left`}
              </span>
            )}
          </div>
          {project.next_task && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onFeedback(project, 'do_now')} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Do now
              </button>
              <button onClick={() => onFeedback(project, 'too_big')} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Too big
              </button>
              <button onClick={() => onFeedback(project, 'not_urgent')} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Not urgent
              </button>
              <button onClick={() => onFeedback(project, 'waiting_on_someone')} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Waiting
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryPill({ icon: Icon, label, value }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-blue-200" />
        <span className="text-xs uppercase tracking-wide text-slate-300">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [triageTask, setTriageTask] = useState<TodayTask | null>(null)
  const [routineOpen, setRoutineOpen] = useState(false)
  const { data, isLoading } = useSWR<TodayData>('/api/today', fetcher)

  const overdue = data?.overdue_tasks ?? []
  const todayTasks = data?.today_tasks ?? []
  const upcoming = data?.upcoming_tasks ?? []
  const projectWork = data?.project_work ?? []
  const recurringTemplates = data?.recurring_templates ?? []

  const deadlineFeed: TodayItem[] = [
    ...upcoming.map((task) => ({
      kind: 'task' as const,
      id: task.id,
      title: task.title,
      due_date: task.due_date ?? format(new Date(), 'yyyy-MM-dd'),
      due_time: task.due_time,
      project_name: task.project?.name,
      project_color: task.project?.color,
      priority: task.priority,
    })),
    ...projectWork
      .filter((project) => project.due_date)
      .map((project) => ({
        kind: 'project' as const,
        id: project.id,
        title: project.name,
        due_date: project.due_date as string,
        project_name: project.name,
        project_color: project.color,
      })),
  ].sort((a, b) => a.due_date.localeCompare(b.due_date))

  async function handleComplete(task: TodayTask) {
    await fetch(`/api/projects/${task.project_id}/subtasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, completed: true }),
    })
    mutate('/api/today')
    mutate('/api/tasks')
  }

  async function handleDefer(task: TodayTask) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextDate = format(tomorrow, 'yyyy-MM-dd')
    await fetch(`/api/projects/${task.project_id}/subtasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        due_date: nextDate,
        recommendation_feedback: null,
      }),
    })
    mutate('/api/today')
    mutate('/api/tasks')
  }

  async function handleFeedback(project: ProjectWork, feedback: RecommendationFeedback) {
    if (!project.next_task) return
    await fetch(`/api/projects/${project.id}/subtasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: project.next_task.id,
        recommendation_feedback: feedback,
        status: feedback === 'waiting_on_someone' ? 'waiting' : project.next_task?.status,
      }),
    })
    mutate('/api/today')
    mutate('/api/tasks')
  }

  async function handleCreateTodayRoutine(templateId: string) {
    await fetch(`/api/recurring-templates/${templateId}/create-today`, { method: 'POST' })
    mutate('/api/today')
    mutate('/api/tasks')
  }

  const heroStats = [
    { label: 'Overdue', value: data?.summary.overdue_count ?? 0, icon: AlertTriangle },
    { label: 'Due today', value: data?.summary.due_today_count ?? 0, icon: ListTodo },
    { label: 'This week', value: data?.summary.upcoming_count ?? 0, icon: CalendarDays },
    { label: 'Projects', value: data?.summary.project_count ?? 0, icon: FolderKanban },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Today" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 pb-24 lg:px-6 lg:pb-6">
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-6 text-white shadow-xl lg:px-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Personal OS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
                {format(new Date(), 'EEEE, MMMM d')}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Calendar sync is paused for now. This view keeps the focus on tasks due today, the next wave of deadlines, and the projects that deserve your attention first.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Capture fast from mobile or desktop
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Due work first
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  Recommended project work next
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[420px]">
              {heroStats.map((stat) => (
                <SummaryPill
                  key={stat.label}
                  icon={stat.icon}
                  label={stat.label}
                  value={stat.value}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Quick capture</p>
            <p className="text-xs text-blue-700">Add a task from your phone without dropping the thread.</p>
          </div>
          <Button onClick={() => setCaptureOpen(true)} className="sm:self-start">
            <Plus size={14} className="mr-1.5" />
            Capture task
          </Button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Today&apos;s agenda</h2>
                <p className="text-xs text-slate-500">Overdue work and tasks due today.</p>
              </div>
              <Badge variant={overdue.length > 0 ? 'red' : 'gray'}>
                {overdue.length} overdue
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : overdue.length === 0 && todayTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-800">Nothing due today.</p>
                  <p className="mt-1 text-sm text-slate-500">Use the capture button to drop in work before it gets lost.</p>
                </div>
              ) : (
                <>
                  {overdue.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Overdue</p>
                      {overdue.map((task) => (
                        <TaskRow key={task.id} task={task} onComplete={handleComplete} onEdit={setTriageTask} onDefer={handleDefer} />
                      ))}
                    </div>
                  )}
                  {todayTasks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due today</p>
                      {todayTasks.map((task) => (
                        <TaskRow key={task.id} task={task} onComplete={handleComplete} onEdit={setTriageTask} onDefer={handleDefer} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Inbox</h2>
                <p className="text-xs text-slate-500">Misc work and uncategorized tasks.</p>
              </div>
              <Badge variant="gray">{(data?.inbox_tasks ?? []).length} items</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : (data?.inbox_tasks ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-800">Inbox is clear.</p>
                  <p className="mt-1 text-sm text-slate-500">Capture something and it will land here for triage.</p>
                </div>
              ) : (
                (data?.inbox_tasks ?? []).map((task) => (
                  <TaskRow key={task.id} task={task} onComplete={handleComplete} onEdit={setTriageTask} onDefer={handleDefer} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Recommended project work</h2>
              <p className="text-xs text-slate-500">Closest deadlines and the next action worth pushing.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : projectWork.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-800">No active projects yet.</p>
                  <p className="mt-1 text-sm text-slate-500">Create a project so the app can recommend what to work on next.</p>
                </div>
              ) : (
                projectWork.slice(0, 4).map((project) => (
                  <ProjectCardRow key={project.id} project={project} onFeedback={handleFeedback} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Admin routines</h2>
                <p className="text-xs text-slate-500">Recurring internship tasks you can spin up for today.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setRoutineOpen(true)}>
                <Plus size={14} className="mr-1.5" />
                Add routine
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recurringTemplates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-800">No routines yet.</p>
                  <p className="mt-1 text-sm text-slate-500">Add things like submit hours, daily email sweep, or check staffing notes.</p>
                </div>
              ) : (
                recurringTemplates.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{template.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{template.cadence_label}</span>
                          {template.due_time && <span>{formatTime(`2026-01-01T${template.due_time}:00`)}</span>}
                          {template.expected_hours != null && <span>Est. {formatHours(template.expected_hours)}</span>}
                        </div>
                      </div>
                      {template.today_task ? (
                        <Badge variant={statusVariant(template.today_task.status)}>{template.today_task.status}</Badge>
                      ) : (
                        <Button size="sm" onClick={() => handleCreateTodayRoutine(template.id)}>
                          <Repeat size={14} className="mr-1.5" />
                          Add today
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-900">Wrap up today</h2>
              <p className="text-xs text-slate-500">Keep the internship loop tight before you sign off.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={16} className="text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Daily log</p>
                      <p className="text-xs text-slate-500">
                        {data?.review.standup_done ? 'Logged for today' : 'Still needs a quick review'}
                      </p>
                    </div>
                  </div>
                  <Link href="/standup" className="text-sm font-medium text-blue-600 hover:underline">
                    {data?.review.standup_done ? 'Open' : 'Review'}
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Timer size={16} className="text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Hours</p>
                      <p className="text-xs text-slate-500">
                        {data?.review.hours_logged
                          ? `${data.review.hours_worked} hours logged`
                          : 'No hours logged yet'}
                      </p>
                    </div>
                  </div>
                  <Link href="/hours" className="text-sm font-medium text-blue-600 hover:underline">
                    {data?.review.hours_logged ? 'Adjust' : 'Log'}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Next 7 days</h2>
              <p className="text-xs text-slate-500">Upcoming deadlines from tasks and projects.</p>
            </div>
            <Badge variant="blue">{deadlineFeed.length} items</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : deadlineFeed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-800">Nothing pressing this week.</p>
                <p className="mt-1 text-sm text-slate-500">That&apos;s a good window to chip away at medium-priority project work.</p>
              </div>
            ) : (
              deadlineFeed.slice(0, 10).map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: item.project_color ?? '#94a3b8' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      {item.kind === 'project' && <Badge variant="gray">Project</Badge>}
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {item.project_name ?? 'Project'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-slate-700">
                      {item.due_time
                        ? `${dueDateLabel(item.due_date)} at ${formatTime(`${item.due_date}T${item.due_time}:00`)}`
                        : dueDateLabel(item.due_date)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <QuickCaptureModal
        key={captureOpen ? 'open' : 'closed'}
        open={captureOpen}
        projects={data?.capture_projects ?? []}
        inboxProjectId={data?.inbox_project?.id ?? ''}
        onClose={() => setCaptureOpen(false)}
        onCreated={() => {
          mutate('/api/today')
          mutate('/api/tasks')
        }}
      />

      <TaskTriageModal
        open={Boolean(triageTask)}
        task={triageTask}
        projects={data?.capture_projects ?? []}
        onClose={() => setTriageTask(null)}
        onSaved={() => {
          mutate('/api/today')
          mutate('/api/tasks')
        }}
      />

      <RecurringTemplateModal
        open={routineOpen}
        projects={data?.capture_projects ?? []}
        inboxProjectId={data?.inbox_project?.id ?? ''}
        onClose={() => setRoutineOpen(false)}
        onCreated={() => {
          mutate('/api/today')
        }}
      />

      <button
        onClick={() => setCaptureOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 lg:hidden"
        aria-label="Quick capture"
      >
        <Plus size={20} />
      </button>
    </div>
  )
}
