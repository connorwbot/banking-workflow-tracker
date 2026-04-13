'use client'

import { startTransition, useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { parseISO } from 'date-fns'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { dueDateLabel, formatTime, formatDateShort } from '@/lib/utils/date'
import {
  CalendarClock,
  CalendarSync,
  CheckCircle2,
  ExternalLink,
  RefreshCcw,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type ScheduledSlot = {
  task_id: string
  title: string
  project_id: string
  project_name: string | null
  project_color: string | null
  start: string
  end: string
  duration_mins: number
  due_date: string | null
  due_time: string | null
  reason: string
}

type UnscheduledTask = {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
  expected_hours: number | null
  project_name: string | null
}

type SchedulerData = {
  connected: boolean
  schedule: ScheduledSlot[]
  unscheduled: UnscheduledTask[]
  error?: string
}

function formatDuration(mins: number) {
  if (mins % 60 === 0) return `${mins / 60}h`
  if (mins < 60) return `${mins}m`
  return `${(mins / 60).toFixed(2).replace(/\.?0+$/, '')}h`
}

export function TaskSchedulerCard() {
  const [days, setDays] = useState(7)
  const [dueWithinDays, setDueWithinDays] = useState(14)
  const [scheduling, setScheduling] = useState(false)
  const [message, setMessage] = useState('')

  const { data, isLoading, mutate: mutateScheduler } = useSWR<SchedulerData>(
    `/api/calendar/tasks?days=${days}&due_within_days=${dueWithinDays}`,
    fetcher
  )

  async function handleSchedule(overwrite = false) {
    setScheduling(true)
    setMessage('')
    try {
      const res = await fetch('/api/calendar/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, due_within_days: dueWithinDays, overwrite }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error ?? 'Could not schedule tasks')
      }

      setMessage(
        body.count > 0
          ? `Scheduled ${body.count} task block${body.count === 1 ? '' : 's'} to Google Calendar.`
          : 'No schedulable task blocks found right now.'
      )

      startTransition(() => {
        mutateScheduler()
        mutate('/api/today')
        mutate('/api/tasks')
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not schedule tasks')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Calendar scheduler</h2>
          <p className="text-xs text-slate-500">
            Copy Outlook meetings into Google Calendar, then let the app place task blocks around them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dueWithinDays}
            onChange={(e) => setDueWithinDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={3}>Due in 3d</option>
            <option value={7}>Due in 7d</option>
            <option value={14}>Due in 14d</option>
            <option value={21}>Due in 21d</option>
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={3}>3 days</option>
            <option value={5}>5 days</option>
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => mutateScheduler()}>
            <RefreshCcw size={14} className="mr-1.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : !data?.connected ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Google Calendar not connected</p>
                <p className="mt-1 text-sm text-slate-500">
                  Connect your personal Google Calendar first. Once you copy meetings over from Outlook, the scheduler will treat them as busy time and write task reminders around them.
                </p>
              </div>
              <Link href="/settings" className="shrink-0 text-sm font-medium text-blue-600 hover:underline">
                Open settings
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-blue-700" />
                  <p className="text-sm font-medium text-blue-900">Preview task blocks before writing them</p>
                </div>
                <p className="mt-1 text-xs text-blue-700">
                  The preview uses copied meetings in Google Calendar, your work hours, protected hours, due dates, and expected hours.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => handleSchedule(false)} loading={scheduling}>
                  <CalendarSync size={14} className="mr-1.5" />
                  Schedule now
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleSchedule(true)} disabled={scheduling}>
                  Reschedule open tasks
                </Button>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}

            {data.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {data.error}
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Preview</p>
                    <p className="text-xs text-slate-500">Blocks that can fit around copied meetings for tasks due in the next {dueWithinDays} days.</p>
                  </div>
                  <Badge variant="blue">{data.schedule.length} blocks</Badge>
                </div>
                {data.schedule.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-800">No task blocks fit right now.</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try shortening task estimates, widening work hours, or copying in fewer meeting holds.
                    </p>
                  </div>
                ) : (
                  data.schedule.slice(0, 6).map((slot) => {
                    const start = parseISO(slot.start)
                    const end = parseISO(slot.end)
                    return (
                      <div key={`${slot.task_id}-${slot.start}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: slot.project_color ?? '#94a3b8' }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">{slot.title}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {slot.project_name ?? 'No project'}
                                </p>
                              </div>
                              <Badge variant="gray">{formatDuration(slot.duration_mins)}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{formatDateShort(start)} at {formatTime(start)}</span>
                              <span>to {formatTime(end)}</span>
                              {slot.due_date && (
                                <span>
                                  Due {dueDateLabel(slot.due_date)}
                                  {slot.due_time ? ` at ${formatTime(`${slot.due_date}T${slot.due_time}:00`)}` : ''}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{slot.reason}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Needs help</p>
                    <p className="text-xs text-slate-500">Open tasks that did not fit in the current window.</p>
                  </div>
                  <Badge variant="orange">{data.unscheduled.length} unscheduled</Badge>
                </div>
                {data.unscheduled.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <CheckCircle2 size={18} className="mx-auto text-emerald-500" />
                    <p className="mt-2 text-sm font-medium text-slate-800">Everything previewed cleanly.</p>
                    <p className="mt-1 text-sm text-slate-500">You should be able to write the current plan to Google Calendar.</p>
                  </div>
                ) : (
                  data.unscheduled.slice(0, 5).map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {task.project_name && <span>{task.project_name}</span>}
                        {task.expected_hours != null && <span>Est. {task.expected_hours}h</span>}
                        {task.due_date && (
                          <span>
                            Due {dueDateLabel(task.due_date)}
                            {task.due_time ? ` at ${formatTime(`${task.due_date}T${task.due_time}:00`)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">How to use this</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Copy your work meetings from Outlook into Google Calendar, refresh this preview, then write the suggested task blocks so your phone reminders stay in one place.
                  </p>
                  <a
                    href="/settings"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Calendar settings <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
