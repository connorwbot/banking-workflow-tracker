'use client'

import { use } from 'react'
import { useProject, updateProject, deleteProject } from '@/hooks/useProjects'
import { SubtaskList } from '@/components/projects/SubtaskList'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateShort } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, CalendarDays, Trash2 } from 'lucide-react'

const TYPE_VARIANTS = { pitch: 'blue' as const, live_deal: 'green' as const, misc: 'gray' as const }
const TYPE_LABELS = { pitch: 'Pitch', live_deal: 'Live Deal', misc: 'Misc' }
const STATUS_VARIANTS = { active: 'green' as const, on_hold: 'yellow' as const, closed: 'gray' as const, won: 'green' as const, lost: 'red' as const }

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { project, subtasks, loading, refresh } = useProject(id)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Delete "${project?.name}"? This cannot be undone.`)) return
    await deleteProject(id)
    router.push('/projects')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (!project) return <div className="p-6 text-slate-500">Project not found.</div>

  return (
    <div className="flex flex-col flex-1">
      <div className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <h1 className="font-bold text-xl text-slate-900 truncate">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={TYPE_VARIANTS[project.type]}>{TYPE_LABELS[project.type]}</Badge>
            <Badge variant={STATUS_VARIANTS[project.status]}>{project.status.replace('_', ' ')}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {project.company_name && (
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <Building2 size={13} /> {project.company_name}
            </div>
          )}
          {project.due_date && (
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <CalendarDays size={13} /> Due {formatDateShort(project.due_date)}
            </div>
          )}
        </div>

        {project.description && (
          <p className="text-slate-600 text-sm mt-2">{project.description}</p>
        )}
      </div>

      <div className="flex-1 px-4 py-5 lg:px-6 max-w-2xl">
        <SubtaskList subtasks={subtasks} projectId={id} />

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={14} className="mr-1.5" /> Delete project
          </Button>
        </div>
      </div>
    </div>
  )
}
