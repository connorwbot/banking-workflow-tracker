import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils/date'
import type { DealWithProject } from '@/types/database'
import { Building2, CalendarDays } from 'lucide-react'
import Link from 'next/link'

interface DealCardProps {
  deal: DealWithProject
}

export function DealCard({ deal }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-xl border border-slate-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow touch-none"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: deal.project?.color ?? '#3B82F6' }} />
          <Link
            href={`/projects/${deal.project_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-slate-900 truncate hover:text-blue-600"
          >
            {deal.project?.name ?? 'Unnamed'}
          </Link>
        </div>
        {deal.probability !== null && (
          <Badge variant={deal.probability >= 70 ? 'green' : deal.probability >= 40 ? 'yellow' : 'gray'}>
            {deal.probability}%
          </Badge>
        )}
      </div>

      {deal.project?.company_name && (
        <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
          <Building2 size={10} /> {deal.project.company_name}
        </div>
      )}

      {deal.expected_close && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <CalendarDays size={10} /> Close {formatDateShort(deal.expected_close)}
        </div>
      )}

      {deal.project?.deal_size && (
        <p className="text-xs text-slate-400 mt-1">
          ${(deal.project.deal_size / 1e6).toFixed(1)}M
        </p>
      )}
    </div>
  )
}
