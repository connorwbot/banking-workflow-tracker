'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { saveStandup } from '@/hooks/useStandup'
import { format } from 'date-fns'
import type { StandupLog } from '@/types/database'

const MOODS = ['😴', '😕', '😐', '😊', '🔥']

interface StandupFormProps {
  existing?: StandupLog | null
  onSaved?: () => void
}

export function StandupForm({ existing, onSaved }: StandupFormProps) {
  const [workedOn, setWorkedOn] = useState(existing?.worked_on ?? '')
  const [blockers, setBlockers] = useState(existing?.blockers ?? '')
  const [wins, setWins] = useState(existing?.wins ?? '')
  const [tomorrow, setTomorrow] = useState(existing?.tomorrow_plan ?? '')
  const [mood, setMood] = useState<number | null>(existing?.mood_score ?? null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await saveStandup({
      log_date: format(new Date(), 'yyyy-MM-dd'),
      worked_on: workedOn || null,
      blockers: blockers || null,
      wins: wins || null,
      tomorrow_plan: tomorrow || null,
      mood_score: mood,
    })
    setSaved(true)
    setLoading(false)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">What did I work on today?</label>
        <textarea
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          rows={3}
          placeholder="Pitched Project Mercury to MD, updated financial model..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Blockers</label>
        <textarea
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          rows={2}
          placeholder="Waiting on comps from research, MD hasn't reviewed draft..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Wins / Highlights</label>
        <textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          rows={2}
          placeholder="Deal signed, MD gave positive feedback..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Plan for tomorrow</label>
        <textarea
          value={tomorrow}
          onChange={(e) => setTomorrow(e.target.value)}
          rows={2}
          placeholder="Finish CIM, send to client by EOD..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Energy level today</label>
        <div className="flex gap-3">
          {MOODS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMood(i + 1)}
              className={`text-2xl transition-all ${mood === i + 1 ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {saved && (
        <p className="text-green-600 text-sm font-medium">Saved!</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        {existing ? 'Update log' : 'Save daily log'}
      </Button>
    </form>
  )
}
