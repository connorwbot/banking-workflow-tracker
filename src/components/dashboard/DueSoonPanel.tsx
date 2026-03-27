'use client'

import { useProjects } from '@/hooks/useProjects'
import { Badge } from '@/components/ui/Badge'
import { priorityConfig } from '@/lib/utils/priority'
import { dueDateLabel } from '@/lib/utils/date'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { addDays, parseISO } from 'date-fns'
import useSWR from 'swr'
import type { Subtask } from '@/types/database'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function DueSoonPanel() {
  const { projects, loading: projLoading } = useProjects()

  // We'll get all subtasks from all projects via a combined query
  const projectIds = projects.map((p) => p.id)

  if (projLoading) return <SkeletonCard />

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 text-sm">Due Soon</h2>
        <Link href="/projects" className="text-xs text-blue-600 hover:underline">View all</Link>
      </CardHeader>
      <CardContent className="p-0">
        <DueSoonList />
      </CardContent>
    </Card>
  )
}

function DueSoonList() {
  const { data, isLoading } = useSWR<{ subtasks: (Subtask & { project_name: string; project_color: string })[] }>(
    '/api/due-soon',
    fetcher
  )

  if (isLoading) return <div className="p-4"><SkeletonCard /></div>

  const items = data?.subtasks ?? []

  if (items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6 px-4">Nothing due in the next 7 days</p>
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.slice(0, 8).map((task) => {
        const pCfg = priorityConfig(task.priority)
        return (
          <div key={task.id} className="px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.project_color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800 truncate">{task.title}</p>
              <p className="text-xs text-slate-400 truncate">{task.project_name}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <Badge variant={task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'orange' : task.priority === 'medium' ? 'blue' : 'gray'}>
                {pCfg.label}
              </Badge>
              {task.due_date && (
                <span className="text-xs text-slate-400">{dueDateLabel(task.due_date)}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
