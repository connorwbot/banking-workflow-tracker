'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { priorityConfig } from '@/lib/utils/priority'
import { dueDateLabel } from '@/lib/utils/date'
import { updateSubtask, deleteSubtask } from '@/hooks/useProjects'
import { Trash2, CalendarDays } from 'lucide-react'
import type { Subtask } from '@/types/database'
import { cn } from '@/lib/utils/cn'

interface SubtaskRowProps {
  subtask: Subtask
  projectId: string
}

export function SubtaskRow({ subtask, projectId }: SubtaskRowProps) {
  const [loading, setLoading] = useState(false)
  const pConfig = priorityConfig(subtask.priority)

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
          {subtask.due_date && (
            <span className={cn('flex items-center gap-1 text-xs', subtask.due_date < new Date().toISOString().split('T')[0] && !subtask.completed ? 'text-red-500' : 'text-slate-500')}>
              <CalendarDays size={10} />
              {dueDateLabel(subtask.due_date)}
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
