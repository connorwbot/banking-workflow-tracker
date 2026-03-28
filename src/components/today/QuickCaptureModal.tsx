'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createSubtask } from '@/hooks/useProjects'
import type { Project, TeamMember } from '@/types/database'
import { Link2, UserRound } from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface QuickCaptureModalProps {
  open: boolean
  projects: Pick<Project, 'id' | 'name' | 'color' | 'status'>[]
  inboxProjectId: string
  onClose: () => void
  onCreated: () => void
}

const PRIORITIES = [
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const

export function QuickCaptureModal({ open, projects, inboxProjectId, onClose, onCreated }: QuickCaptureModalProps) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [ownerMemberId, setOwnerMemberId] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [expectedHours, setExpectedHours] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: membersData } = useSWR<{ members: TeamMember[] }>(open ? '/api/team-members' : null, fetcher)
  const members = membersData?.members ?? []
  const selectedProjectId = projectId || inboxProjectId || projects[0]?.id || ''
  const activeProjectId = selectedProjectId || inboxProjectId
  const activeOwnerId = ownerMemberId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Add a task title.')
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
      await createSubtask(activeProjectId || inboxProjectId, {
        title: title.trim(),
        priority,
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
        expected_hours: parsedExpectedHours ?? undefined,
        description: description || undefined,
        owner_member_id: activeOwnerId || undefined,
      })
      onCreated()
      onClose()
    } catch {
      setError('Failed to save task.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick Capture" className="sm:max-w-lg">
      {!inboxProjectId && projects.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Create a project first so captured tasks have somewhere to live.
          </p>
          <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
            <Link2 size={14} /> Go to Projects
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Task title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Send updated model to MD"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Belongs to</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {inboxProjectId && <option value={inboxProjectId}>Inbox / Misc</option>}
                {projects.filter((project) => project.id !== inboxProjectId).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Due time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected hours</label>
            <input
              type="number"
              min="0"
              step="0.25"
              inputMode="decimal"
              value={expectedHours}
              onChange={(e) => setExpectedHours(e.target.value)}
              placeholder="2.5"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">Optional estimate for effort and later scheduling.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Analyst / Associate</label>
            <select
              value={activeOwnerId}
              onChange={(e) => setOwnerMemberId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No owner yet</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <UserRound size={12} /> Optional owner for staffing and workflow context
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Any context or detail you want to remember"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Capture task
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
