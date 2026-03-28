'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Project, PriorityLevel, TeamMember, RecurringCadence } from '@/types/database'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface RecurringTemplateModalProps {
  open: boolean
  projects: Pick<Project, 'id' | 'name' | 'color' | 'status'>[]
  inboxProjectId: string
  onClose: () => void
  onCreated: () => void
}

export function RecurringTemplateModal({
  open,
  projects,
  inboxProjectId,
  onClose,
  onCreated,
}: RecurringTemplateModalProps) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(inboxProjectId)
  const [priority, setPriority] = useState<PriorityLevel>('medium')
  const [cadence, setCadence] = useState<RecurringCadence>('weekdays')
  const [weekday, setWeekday] = useState('1')
  const [dueTime, setDueTime] = useState('')
  const [expectedHours, setExpectedHours] = useState('')
  const [ownerMemberId, setOwnerMemberId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: membersData } = useSWR<{ members: TeamMember[] }>(open ? '/api/team-members' : null, fetcher)
  const members = membersData?.members ?? []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Template title is required.')
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
      const res = await fetch('/api/recurring-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          project_id: projectId || inboxProjectId || null,
          owner_member_id: ownerMemberId || null,
          priority,
          cadence,
          weekday: cadence === 'weekly' ? Number(weekday) : null,
          due_time: dueTime || null,
          expected_hours: parsedExpectedHours,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      onCreated()
      onClose()
      setTitle('')
      setProjectId(inboxProjectId)
      setPriority('medium')
      setCadence('weekdays')
      setWeekday('1')
      setDueTime('')
      setExpectedHours('')
      setOwnerMemberId('')
      setDescription('')
    } catch {
      setError('Could not save recurring routine.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New recurring routine" className="sm:max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Submit timesheet"
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as RecurringCadence)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
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

        {cadence === 'weekly' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Day of week</label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
              <option value="0">Sunday</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
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
              placeholder="0.5"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
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
            Save routine
          </Button>
        </div>
      </form>
    </Modal>
  )
}
