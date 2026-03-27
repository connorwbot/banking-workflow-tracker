'use client'

import { useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Plus } from 'lucide-react'
import type { ProjectType } from '@/types/database'

const TYPES: { value: ProjectType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pitch', label: 'Pitches' },
  { value: 'live_deal', label: 'Live Deals' },
  { value: 'misc', label: 'Misc' },
]

export default function ProjectsPage() {
  const { projects, loading, refresh } = useProjects()
  const [filter, setFilter] = useState<ProjectType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.type === filter)
  const active = filtered.filter((p) => p.status === 'active' || p.status === 'on_hold')
  const closed = filtered.filter((p) => ['closed', 'won', 'lost'].includes(p.status))

  return (
    <div className="flex flex-col flex-1">
      <Header title="Projects" />
      <div className="flex-1 px-4 py-5 lg:px-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1" /> New
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Active ({active.length})</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </div>
            )}
            {closed.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Closed ({closed.length})</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {closed.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400 mb-4">No projects yet</p>
                <Button onClick={() => setShowForm(true)}>Create your first project</Button>
              </div>
            )}
          </>
        )}
      </div>

      <ProjectForm open={showForm} onClose={() => setShowForm(false)} onCreated={refresh} />
    </div>
  )
}
