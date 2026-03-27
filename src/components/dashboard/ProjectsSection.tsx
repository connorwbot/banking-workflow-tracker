'use client'

import { useState } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { ProjectType } from '@/types/database'

const TABS: { value: ProjectType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pitch', label: 'Pitches' },
  { value: 'live_deal', label: 'Live Deals' },
  { value: 'misc', label: 'Misc' },
]

export function ProjectsSection() {
  const { projects, loading, refresh } = useProjects()
  const [tab, setTab] = useState<ProjectType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  const active = projects.filter((p) => p.status === 'active')
  const filtered = tab === 'all' ? active : active.filter((p) => p.type === tab)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                tab === value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects" className="text-xs text-blue-600 hover:underline">View all</Link>
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
            <Plus size={12} className="mr-1" /> New
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 border-dashed p-8 text-center">
          <p className="text-slate-400 text-sm mb-3">No active {tab === 'all' ? 'projects' : tab.replace('_', ' ')}s</p>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} className="mr-1" /> Add project
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 6).map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <ProjectForm open={showForm} onClose={() => setShowForm(false)} onCreated={refresh} />
    </div>
  )
}
