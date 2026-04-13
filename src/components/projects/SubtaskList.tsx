'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { SubtaskRow } from './SubtaskRow'
import { Button } from '@/components/ui/Button'
import { createSubtask } from '@/hooks/useProjects'
import type { Subtask, PriorityLevel, TeamMember } from '@/types/database'
import { Plus, ChevronDown } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface SubtaskListProps {
  subtasks: Subtask[]
  projectId: string
}

export function SubtaskList({ subtasks, projectId }: SubtaskListProps) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<PriorityLevel>('medium')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [expectedHours, setExpectedHours] = useState('')
  const [ownerMemberId, setOwnerMemberId] = useState('')
  const [delegatedBy, setDelegatedBy] = useState<string[]>([])
  const [showDelegateMenu, setShowDelegateMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: membersData } = useSWR<{ members: TeamMember[] }>('/api/team-members', fetcher)
  const members = membersData?.members ?? []

  const open = subtasks.filter((s) => !s.completed)
  const done = subtasks.filter((s) => s.completed)

  function toggleMember(id: string) {
    setDelegatedBy((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (dueTime && !dueDate) {
      setError('Pick a due date when using a due time.')
      return
    }
    const parsedExpectedHours = expectedHours.trim() ? Number(expectedHours) : null
    if (parsedExpectedHours !== null && (!Number.isFinite(parsedExpectedHours) || parsedExpectedHours <= 0)) {
      setError('Expected hours must be a positive number.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await createSubtask(projectId, {
        title,
        priority,
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
        expected_hours: parsedExpectedHours ?? undefined,
        owner_member_id: ownerMemberId || undefined,
        delegated_by: delegatedBy.length > 0 ? delegatedBy : undefined,
      })
      setTitle('')
      setPriority('medium')
      setDueDate('')
      setDueTime('')
      setExpectedHours('')
      setOwnerMemberId('')
      setDelegatedBy([])
      setAdding(false)
    } catch {
      setError('Could not save that task.')
    } finally {
      setLoading(false)
    }
  }

  const delegateLabel = delegatedBy.length === 0
    ? 'Delegated by (optional)'
    : members.filter((m) => delegatedBy.includes(m.id)).map((m) => m.name).join(', ')

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

          <div className="grid grid-cols-2 gap-2">
            <select
              value={ownerMemberId}
              onChange={(e) => setOwnerMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Belongs to</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            type="number"
            min="0"
            step="0.25"
            inputMode="decimal"
            value={expectedHours}
            onChange={(e) => setExpectedHours(e.target.value)}
            placeholder="Expected hours (optional)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {members.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDelegateMenu((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-left"
              >
                <span className={delegatedBy.length === 0 ? 'text-slate-400' : 'text-slate-700 truncate'}>
                  {delegateLabel}
                </span>
                <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-2" />
              </button>
              {showDelegateMenu && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-md mt-1 overflow-hidden">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={delegatedBy.includes(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-700">{m.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => { setAdding(false); setShowDelegateMenu(false) }} className="flex-1">Cancel</Button>
            <Button type="submit" size="sm" loading={loading} className="flex-1">Add</Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}

      <div>
        {open.map((s) => <SubtaskRow key={s.id} subtask={s} projectId={projectId} members={members} />)}
        {open.length === 0 && !adding && (
          <p className="text-slate-400 text-sm text-center py-4">No open tasks</p>
        )}
      </div>

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 mb-2">
            {done.length} completed
          </summary>
          {done.map((s) => <SubtaskRow key={s.id} subtask={s} projectId={projectId} members={members} />)}
        </details>
      )}
    </div>
  )
}
