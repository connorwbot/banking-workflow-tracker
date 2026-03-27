'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { usePipeline, moveDealStage } from '@/hooks/usePipeline'
import { PipelineColumn } from '@/components/pipeline/PipelineColumn'
import { DealCard } from '@/components/pipeline/DealCard'
import { StageTransitionModal } from '@/components/pipeline/StageTransitionModal'
import { Header } from '@/components/layout/Header'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { DealWithProject } from '@/types/database'

interface PendingMove {
  deal: DealWithProject
  toStageId: string
  toStageName: string
}

export default function PipelinePage() {
  const { stages, deals, loading, refresh } = usePipeline()
  const [activeDeal, setActiveDeal] = useState<DealWithProject | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function handleDragStart(e: DragStartEvent) {
    const deal = deals.find((d) => d.id === e.active.id)
    if (deal) setActiveDeal(deal)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = e
    if (!over) return

    const deal = deals.find((d) => d.id === active.id)
    if (!deal) return

    // over.id could be a stage id (dropped on column) or another deal id
    let targetStageId = stages.find((s) => s.id === over.id)?.id
    if (!targetStageId) {
      const targetDeal = deals.find((d) => d.id === over.id)
      targetStageId = targetDeal?.stage_id
    }

    if (!targetStageId || targetStageId === deal.stage_id) return

    const toStage = stages.find((s) => s.id === targetStageId)
    if (!toStage) return

    setPendingMove({ deal, toStageId: targetStageId, toStageName: toStage.name })
  }

  async function confirmMove(notes: string) {
    if (!pendingMove) return
    await moveDealStage(pendingMove.deal.id, pendingMove.toStageId, notes)
    setPendingMove(null)
    refresh()
  }

  function cancelMove() {
    setPendingMove(null)
  }

  const activeStages = stages.filter((s) => !s.is_terminal || deals.some((d) => d.stage_id === s.id))

  return (
    <div className="flex flex-col flex-1">
      <Header title="Deal Pipeline" />

      <div className="flex-1 px-4 py-5 lg:px-6">
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1,2,3,4].map((i) => <div key={i} className="w-64 flex-shrink-0"><SkeletonCard /></div>)}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 xl:grid-cols-7 lg:overflow-visible">
              {activeStages.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  deals={deals.filter((d) => d.stage_id === stage.id)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeDeal && <DealCard deal={activeDeal} />}
            </DragOverlay>
          </DndContext>
        )}

        {deals.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-slate-400">No deals in the pipeline yet.</p>
            <p className="text-slate-400 text-sm mt-1">Create a Pitch or Live Deal project to start tracking.</p>
          </div>
        )}
      </div>

      {pendingMove && (
        <StageTransitionModal
          open
          dealName={pendingMove.deal.project?.name ?? 'Deal'}
          fromStage={pendingMove.deal.stage?.name ?? ''}
          toStage={pendingMove.toStageName}
          onConfirm={confirmMove}
          onCancel={cancelMove}
        />
      )}
    </div>
  )
}
