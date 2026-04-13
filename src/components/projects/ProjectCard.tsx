import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils/date'
import type { Project } from '@/types/database'
import { CalendarDays, Building2 } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  subtaskCount?: number
  completedCount?: number
}

const TYPE_VARIANTS = {
  pitch: 'blue' as const,
  live_deal: 'green' as const,
  misc: 'gray' as const,
}

const TYPE_LABELS = { pitch: 'Pitch', live_deal: 'Live Deal', misc: 'Misc' }

export function ProjectCard({ project, subtaskCount = 0, completedCount = 0 }: ProjectCardProps) {
  const progress = subtaskCount > 0 ? Math.round((completedCount / subtaskCount) * 100) : 0

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
            <span className="font-medium text-slate-900 text-sm truncate">{project.name}</span>
          </div>
          <Badge variant={TYPE_VARIANTS[project.type]}>{TYPE_LABELS[project.type]}</Badge>
        </div>

        {project.company_name && (
          <div className="flex items-center gap-1 text-slate-500 text-xs mb-2">
            <Building2 size={11} />
            <span>{project.company_name}</span>
          </div>
        )}

        {project.due_date && (
          <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
            <CalendarDays size={11} />
            <span>Due {formatDateShort(project.due_date)}</span>
          </div>
        )}

        {subtaskCount > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{completedCount}/{subtaskCount} tasks</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: project.color }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
