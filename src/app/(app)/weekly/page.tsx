'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { StandupEntry } from '@/components/standup/StandupEntry'
import { format, addDays, subDays, startOfWeek, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import type { Subtask, Project, StandupLog } from '@/types/database'
import { priorityConfig } from '@/lib/utils/priority'

interface WeeklyData {
  week: { start: string; end: string }
  subtasks: (Subtask & { project: { name: string; color: string; type: string } | null })[]
  projects: Project[]
  standups: StandupLog[]
  taskProgress: { completed: number; total: number }
  availabilityByDay: Record<string, number>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function WeeklyPage() {
  const [refDate, setRefDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const weekParam = format(refDate, 'yyyy-MM-dd')

  const { data, isLoading } = useSWR<WeeklyData>(`/api/weekly-digest?week=${weekParam}`, fetcher)

  const days = Array.from({ length: 7 }, (_, i) => format(addDays(refDate, i), 'yyyy-MM-dd'))
  const maxEvents = Math.max(...Object.values(data?.availabilityByDay ?? {}), 1)

  return (
    <div className="flex flex-col flex-1">
      <Header title="Weekly Digest" />

      <div className="flex-1 px-4 py-5 lg:px-6 space-y-6 max-w-3xl">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setRefDate((d) => subDays(d, 7))} className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-slate-700 text-sm">
            {format(refDate, 'MMM d')} – {format(addDays(refDate, 6), 'MMM d, yyyy')}
          </span>
          <button onClick={() => setRefDate((d) => addDays(d, 7))} className="p-2 rounded-lg hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Availability heatmap */}
        <div>
          <h2 className="font-semibold text-slate-700 text-sm mb-2">Calendar Busy-ness</h2>
          <div className="flex gap-1">
            {days.map((d) => {
              const count = data?.availabilityByDay?.[d] ?? 0
              const intensity = Math.min(count / maxEvents, 1)
              const isToday = d === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full h-8 rounded-lg transition-all"
                    style={{ backgroundColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.8})` }}
                  />
                  <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                    {format(parseISO(d), 'EEE')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Deadline timeline */}
        {(data?.subtasks.length ?? 0) > 0 || (data?.projects.length ?? 0) > 0 ? (
          <div>
            <h2 className="font-semibold text-slate-700 text-sm mb-3">Deadlines This Week</h2>
            <div className="space-y-4">
              {days.map((d) => {
                const dayTasks = (data?.subtasks ?? []).filter((s) => s.due_date === d)
                const dayProjects = (data?.projects ?? []).filter((p) => p.due_date === d)
                if (dayTasks.length === 0 && dayProjects.length === 0) return null
                return (
                  <div key={d} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-600">{format(parseISO(d), 'd')}</span>
                      </div>
                      <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                    </div>
                    <div className="pb-4 flex-1 space-y-2">
                      <p className="text-xs text-slate-500">{format(parseISO(d), 'EEEE')}</p>
                      {dayProjects.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-sm font-medium text-slate-800">{p.name}</span>
                          <Badge variant="orange">Project due</Badge>
                        </div>
                      ))}
                      {dayTasks.map((s) => {
                        const pCfg = priorityConfig(s.priority)
                        return (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.project?.color ?? '#3B82F6' }} />
                            <span className="text-sm text-slate-700">{s.title}</span>
                            <Badge variant={s.priority === 'urgent' ? 'red' : s.priority === 'high' ? 'orange' : 'blue'}>
                              {pCfg.label}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }).filter(Boolean)}
            </div>
          </div>
        ) : null}

        {/* Task progress */}
        {data?.taskProgress && data.taskProgress.total > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 text-sm mb-3">Task Progress</h2>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Completed this week</span>
                <span className="text-sm font-semibold text-slate-900">
                  {data.taskProgress.completed} / {data.taskProgress.total}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round((data.taskProgress.completed / data.taskProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                {Math.round((data.taskProgress.completed / data.taskProgress.total) * 100)}% completion rate
              </p>
            </div>
          </div>
        )}

        {/* Standup history */}
        {(data?.standups.length ?? 0) > 0 && (
          <div>
            <h2 className="font-semibold text-slate-700 text-sm mb-3">Daily Logs</h2>
            <div className="space-y-3">
              {(data?.standups ?? []).map((l) => <StandupEntry key={l.id} log={l} />)}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        )}

        {!isLoading && (data?.subtasks.length ?? 0) === 0 && (data?.projects.length ?? 0) === 0 && (data?.standups.length ?? 0) === 0 && (
          <p className="text-center text-slate-400 py-8">Nothing logged for this week yet.</p>
        )}
      </div>
    </div>
  )
}
