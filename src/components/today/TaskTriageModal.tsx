'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Project, PriorityLevel, TeamMember, SubtaskStatus } from '@/types/database'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type TaskForEdit = {
  id: string
  title: string
  description: string | null
  priority: PriorityLevel
  status: SubtaskStatus
  due_date: string | null
  due_time: string | null
  expected_hours: number | null
  owner_member_id?: string | null
  project_id: string
}

interface TaskTriageModalProps {
  open: boolean
  task: TaskForEdit | null
  projects: Pick<Project, 'id' | 'name' | 'color' | 'status'>[]
  onClose: () => void
  onSaved: () => void
}

export function TaskTriageModal({ open, task, projects, onClose, onSaved }: TaskTriageModalProps) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<PriorityLevel>('medium')
  const [status, setStatus] = useState<SubtaskStatus>('open')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [expectedHours, setExpectedHours] = useState('')
  const [ownerMemberId, setOwnerMemberId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: membersData } = useSWR<{ members: TeamMember[] }>(open ? '/api/team-members' : null, fetcher)
  const members = membersData?.members ?? []

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setProjectId(task.project_id)
    setPriority(task.priority)
    setStatus(task.status)
    setDueDate(task.due_date ?? '')
    setDueTime(task.due_time ?? '')
    setExpectedHours(task.expected_hours != null ? String(task.expected_hours) : '')
    setOwnerMemberId(task.owner_member_id ?? '')
    setDescription(task.description ?? '')
    setError('')
  }, [task])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!task) return
    if (!title.trim()) {
      setError('Task title is required.')
      return
    }
    if (dueTime && !dueDate) {
      setError('Add a due date if you want to set a due time.')
      return
    }

    const parsedExpectedHours = expectedHours.trim() ? Number(expectedHours) : null
    if (parsedExpectedHours !== null && (!Number.isFinite(parsedExpectedHours) || parsedExpectedHours <= 0)) {
      setError('Expected hours must be a positive number.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/projects/${task.project_id}/subtasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          title: title.trim(),
          project_id: projectId,
          priority,
          status,
          due_date: dueDate || null,
          due_time: dueTime || null,
          expected_hours: parsedExpectedHours,
          owner_member_id: ownerMemberId || null,
          description: description || null,
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to update task')
      }
      onSaved()
      onClose()
    } catch {
      setError('Could not update task.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Task details" className="sm:max-w-xl">
      {!task ? null : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Task title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubtaskStatus)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="waiting">Waiting</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Analyst / Associate</label>
              <select
                value={ownerMemberId}
                onChange={(e) => setOwnerMemberId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No owner</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Due time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Expected hours</label>
              <input
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                value={expectedHours}
                onChange={(e) => setExpectedHours(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Note</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Save changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
