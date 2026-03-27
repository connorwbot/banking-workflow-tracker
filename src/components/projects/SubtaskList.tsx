'use client'

import { useState } from 'react'
import { SubtaskRow } from './SubtaskRow'
import { Button } from '@/components/ui/Button'
import { createSubtask } from '@/hooks/useProjects'
import type { Subtask, PriorityLevel } from '@/types/database'
import { Plus } from 'lucide-react'

interface SubtaskListProps {
  subtasks: Subtask[]
  projectId: string
}

export function SubtaskList({ subtasks, projectId }: SubtaskListProps) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<PriorityLevel>('medium')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)

  const open = subtasks.filter((s) => !s.completed)
  const done = subtasks.filter((s) => s.completed)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await createSubtask(projectId, { title, priority, due_date: dueDate || undefined })
    setTitle(''); setPriority('medium'); setDueDate(''); setAdding(false)
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 text-sm">Subtasks ({open.length} open)</h3>
        <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>
          <Plus size={14} className="mr-1" /> Add task
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
            <Button type="submit" size="sm" loading={loading} className="flex-1">Add</Button>
          </div>
        </form>
      )}

      <div>
        {open.map((s) => <SubtaskRow key={s.id} subtask={s} projectId={projectId} />)}
        {open.length === 0 && !adding && (
          <p className="text-slate-400 text-sm text-center py-4">No open tasks</p>
        )}
      </div>

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 mb-2">
            {done.length} completed
          </summary>
          {done.map((s) => <SubtaskRow key={s.id} subtask={s} projectId={projectId} />)}
        </details>
      )}
    </div>
  )
}
