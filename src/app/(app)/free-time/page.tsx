'use client'

import { useFreeTime } from '@/hooks/useFreeTime'
import { FreeTimeSlot } from '@/components/calendar/FreeTimeSlot'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ConnectGoogleBanner } from '@/components/calendar/ConnectGoogleBanner'
import { format, parseISO } from 'date-fns'
import useSWR, { mutate } from 'swr'
import type { FreeTimeSuggestion } from '@/types/database'
import { RefreshCw } from 'lucide-react'

export default function FreeTimePage() {
  const { suggestions, loading, refresh } = useFreeTime(7)
  const { data: profileData } = useSWR('/api/profile', (url) => fetch(url).then((r) => r.json()))
  const connected = profileData?.google_access_token

  async function handleDismiss(id: string) {
    await fetch('/api/free-time/dismiss', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    refresh()
  }

  async function handleAddToCalendar(suggestion: FreeTimeSuggestion) {
    const labels = { gym: 'Gym', lunch: 'Lunch', dinner: 'Dinner', focus_block: 'Focus Time' }
    await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: labels[suggestion.slot_type],
        start: suggestion.start_time,
        end: suggestion.end_time,
        suggestionId: suggestion.id,
      }),
    })
    refresh()
  }

  // Group by date
  const grouped = suggestions.reduce<Record<string, FreeTimeSuggestion[]>>((acc, s) => {
    const d = s.suggestion_date
    if (!acc[d]) acc[d] = []
    acc[d].push(s)
    return acc
  }, {})

  return (
    <div className="flex flex-col flex-1">
      <Header title="Free Time" />

      <div className="flex-1 px-4 py-5 lg:px-6 max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Smart scheduling for the next 7 days</p>
          <Button size="sm" variant="secondary" onClick={refresh}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>

        {!connected && <ConnectGoogleBanner />}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg mb-2">Your week looks packed!</p>
            <p className="text-slate-400 text-sm">No free slots found in the next 7 days.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, slots]) => (
              <div key={date}>
                <h3 className="font-semibold text-slate-700 text-sm mb-2">
                  {format(parseISO(date), 'EEEE, MMMM d')}
                </h3>
                <div className="space-y-2">
                  {slots.map((s) => (
                    <FreeTimeSlot
                      key={s.id}
                      suggestion={s}
                      onDismiss={handleDismiss}
                      onAddToCalendar={handleAddToCalendar}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
