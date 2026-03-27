'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { isToday, isPast, parseISO, addDays } from 'date-fns'
import { Header } from '@/components/layout/Header'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { PRIORITY_CONFIG } from '@/lib/utils/priority'
import { dueDateLabel } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import type { Subtask } from '@/types/database'

type TaskWithProject = Subtask & {
  project: { name: string; color: string; type: string; status: string } | null
}

type FilterType = 'all' | 'pitch' | 'live_deal' | 'misc'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'pitch',     label: 'Pitches' },
  { value: 'live_deal', label: 'Live Deals' },
  { value: 'misc',      label: 'Misc' },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function TaskRow({
  task,
  onToggle,
}: {
  task: TaskWithProject
  onToggle: (task: TaskWithProject) => void
}) {
  const cfg = PRIORITY_CONFIG[task.priority]
  const dateLabel = dueDateLabel(task.due_date)
  const overdue = task.due_date
    ? isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
    : false

  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
      {/* Project color dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: task.project?.color ?? '#94a3b8' }}
      />

      {/* Title + project name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 truncate">{task.title}</p>
        {task.project && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{task.project.name}</p>
        )}
      </div>

      {/* Priority chip */}
      <span
        className={cn(
          cfg.bg,
          cfg.color,
          'hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0'
        )}
      >
        {cfg.label}
      </span>

      {/* Due date */}
      {dateLabel && (
        <span
          className={cn(
            'text-xs whitespace-nowrap flex-shrink-0',
            overdue ? 'text-red-500 font-medium' : 'text-slate-400'
          )}
        >
          {dateLabel}
        </span>
      )}

      {/* Complete button */}
      <button
        onClick={() => onToggle(task)}
        className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-500 flex-shrink-0 transition-colors"
        title="Mark complete"
      />
    </div>
  )
}

function TierSection({
  title,
  tasks,
  onToggle,
}: {
  title: string
  tasks: TaskWithProject[]
  onToggle: (task: TaskWithProject) => void
}) {
  if (tasks.length === 0) return null
  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
        {title}
      </h2>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}

export default function TaskQueuePage() {
  const [filter, setFilter] = useState<FilterType>('all')

  const url = filter === 'all' ? '/api/tasks' : `/api/tasks?type=${filter}`
  const { data, isLoading, mutate } = useSWR<{ tasks: TaskWithProject[] }>(url, fetcher)

  const tasks = data?.tasks ?? []

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const in6 = useMemo(() => {
    const d = addDays(today, 6)
    d.setHours(23, 59, 59, 999)
    return d
  }, [today])

  const { overdueTier, thisWeekTier, laterTier } = useMemo(() => {
    const overdueTier: TaskWithProject[] = []
    const thisWeekTier: TaskWithProject[] = []
    const laterTier: TaskWithProject[] = []

    for (const t of tasks) {
      if (!t.due_date) {
        laterTier.push(t)
        continue
      }
      const d = parseISO(t.due_date)
      if (isToday(d) || isPast(d)) {
        overdueTier.push(t)
      } else if (d <= in6) {
        thisWeekTier.push(t)
      } else {
        laterTier.push(t)
      }
    }

    return { overdueTier, thisWeekTier, laterTier }
  }, [tasks, today, in6])

  async function handleToggle(task: TaskWithProject) {
    await fetch(`/api/projects/${task.project_id}/subtasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, completed: true }),
    })
    mutate()
  }

  const isEmpty = !isLoading && tasks.length === 0

  return (
    <div className="flex flex-col flex-1">
      <Header title="Task Queue" />

      <div className="flex-1 px-4 py-5 lg:px-6 max-w-2xl space-y-5">
        {/* Filter bar + count */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-0.5 flex-nowrap">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {!isLoading && (
            <p className="text-sm text-slate-400 ml-auto whitespace-nowrap">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg mb-2">All clear!</p>
            <p className="text-slate-400 text-sm">No open tasks across your active projects.</p>
          </div>
        )}

        {/* Task tiers */}
        {!isLoading && !isEmpty && (
          <div className="space-y-6">
            <TierSection title="Overdue / Due Today" tasks={overdueTier} onToggle={handleToggle} />
            <TierSection title="Due This Week"       tasks={thisWeekTier} onToggle={handleToggle} />
            <TierSection title="Later / No Date"     tasks={laterTier}   onToggle={handleToggle} />
          </div>
        )}
      </div>
    </div>
  )
}
