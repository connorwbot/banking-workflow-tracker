'use client'

import { useState } from 'react'
import { formatTime } from '@/lib/utils/date'
import { Badge } from '@/components/ui/Badge'
import type { FreeTimeSuggestion } from '@/types/database'
import { Dumbbell, UtensilsCrossed, Laptop2, Coffee, Plus, Check, X } from 'lucide-react'

const SLOT_CONFIG = {
  gym:         { icon: Dumbbell,       label: 'Gym',         color: 'text-orange-500', bg: 'bg-orange-50', colorId: '11' },
  lunch:       { icon: UtensilsCrossed, label: 'Lunch',      color: 'text-green-500',  bg: 'bg-green-50',  colorId: '10' },
  dinner:      { icon: Coffee,          label: 'Dinner',     color: 'text-purple-500', bg: 'bg-purple-50', colorId: '3' },
  focus_block: { icon: Laptop2,         label: 'Focus Time', color: 'text-blue-500',   bg: 'bg-blue-50',   colorId: '7' },
}

const CONFIDENCE_VARIANT = { high: 'green' as const, medium: 'yellow' as const, low: 'gray' as const }

interface FreeTimeSlotProps {
  suggestion: FreeTimeSuggestion
  onDismiss: (id: string) => void
  onAddToCalendar: (suggestion: FreeTimeSuggestion) => Promise<void>
}

export function FreeTimeSlot({ suggestion, onDismiss, onAddToCalendar }: FreeTimeSlotProps) {
  const [addLoading, setAddLoading] = useState(false)
  const config = SLOT_CONFIG[suggestion.slot_type]
  const Icon = config.icon
  const start = new Date(suggestion.start_time)
  const end = new Date(suggestion.end_time)

  async function handleAdd() {
    setAddLoading(true)
    await onAddToCalendar(suggestion)
    setAddLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 text-sm">{config.label}</span>
          <Badge variant={CONFIDENCE_VARIANT[suggestion.confidence]}>{suggestion.confidence}</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatTime(start)} – {formatTime(end)} · {suggestion.duration_mins}m
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {suggestion.gcal_event_id ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <Check size={12} /> Added
          </span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={addLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <Plus size={12} /> Calendar
          </button>
        )}
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="p-1.5 text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
