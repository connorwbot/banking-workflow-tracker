import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DealCard } from './DealCard'
import type { PipelineStage, DealWithProject } from '@/types/database'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: DealWithProject[]
}

export function PipelineColumn({ stage, deals }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div className="flex-shrink-0 w-64 lg:w-auto lg:flex-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
        <h3 className="font-semibold text-slate-700 text-sm">{stage.name}</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{deals.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[120px] space-y-2 p-2 rounded-xl transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-slate-50'
        }`}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs text-slate-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}
