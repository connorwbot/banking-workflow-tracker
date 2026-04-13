'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { priorityConfig } from '@/lib/utils/priority'
import { dueDateLabel, formatTime } from '@/lib/utils/date'
import { updateSubtask, deleteSubtask } from '@/hooks/useProjects'
import { Trash2, CalendarDays } from 'lucide-react'
import type { Subtask, TeamMember } from '@/types/database'
import { cn } from '@/lib/utils/cn'

interface SubtaskRowProps {
  subtask: Subtask
  projectId: string
  members?: TeamMember[]
}

export function SubtaskRow({ subtask, projectId, members = [] }: SubtaskRowProps) {
  const [loading, setLoading] = useState(false)
  const pConfig = priorityConfig(subtask.priority)

  const delegatorNames = (subtask.delegated_by ?? [])
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[]

  const ownerName = subtask.owner_member_id
    ? members.find((m) => m.id === subtask.owner_member_id)?.name ?? null
    : null

  const dueTime = subtask.due_date && subtask.due_time
    ? formatTime(`${subtask.due_date}T${subtask.due_time}:00`)
    : ''
  const dueLabel = dueTime
    ? `${dueDateLabel(subtask.due_date)}${subtask.due_date ? ` at ${dueTime}` : dueTime}`
    : (subtask.due_date ? dueDateLabel(subtask.due_date) : '')

  async function toggleComplete() {
    setLoading(true)
    await updateSubtask(projectId, subtask.id, { completed: !subtask.completed })
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    await deleteSubtask(projectId, subtask.id)
  }

  return (
    <div className={cn('flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 group', subtask.completed && 'opacity-60')}>
      <button
        onClick={toggleComplete}
        disabled={loading}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors min-w-[20px]',
          subtask.completed ? 'border-blue-500 bg-blue-500' : 'border-slate-300 hover:border-blue-400'
        )}
      >
        {subtask.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-slate-800', subtask.completed && 'line-through text-slate-400')}>
          {subtask.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={subtask.priority === 'urgent' ? 'red' : subtask.priority === 'high' ? 'orange' : subtask.priority === 'medium' ? 'blue' : 'gray'} className={pConfig.color}>
            {pConfig.label}
          </Badge>
          <Badge variant={subtask.status === 'blocked' ? 'red' : subtask.status === 'waiting' ? 'orange' : subtask.status === 'done' ? 'green' : 'gray'}>
            {subtask.status}
          </Badge>
          {dueLabel && (
            <span className={cn('flex items-center gap-1 text-xs', subtask.due_date < new Date().toISOString().split('T')[0] && !subtask.completed ? 'text-red-500' : 'text-slate-500')}>
              <CalendarDays size={10} />
              {dueLabel}
            </span>
          )}
          {ownerName && (
            <span className="text-xs text-slate-400">
              Belongs to: {ownerName}
            </span>
          )}
          {subtask.expected_hours !== null && subtask.expected_hours !== undefined && (
            <span className="text-xs text-slate-400">
              Est: {subtask.expected_hours}h
            </span>
          )}
          {delegatorNames.length > 0 && (
            <span className="text-xs text-slate-400">
              From: {delegatorNames.join(', ')}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
