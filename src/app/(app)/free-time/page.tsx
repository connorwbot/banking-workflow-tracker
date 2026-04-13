'use client'

import { useState, useEffect } from 'react'
import { useFreeTime } from '@/hooks/useFreeTime'
import { FreeTimeSlot } from '@/components/calendar/FreeTimeSlot'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ConnectGoogleBanner } from '@/components/calendar/ConnectGoogleBanner'
import { format, parseISO } from 'date-fns'
import useSWR, { mutate } from 'swr'
import type { FreeTimeSuggestion } from '@/types/database'
import { RefreshCw, ShieldCheck } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function ProtectedHoursCard() {
  const { data: prefsData, mutate: mutatePrefs } = useSWR('/api/preferences', (u: string) => fetch(u).then(r => r.json()))

  const [enabled, setEnabled] = useState(true)
  const [startDay, setStartDay] = useState(5)   // Friday
  const [startTime, setStartTime] = useState('19:00')
  const [endDay, setEndDay] = useState(6)         // Saturday
  const [endTime, setEndTime] = useState('10:00')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const p = prefsData?.preferences
    if (!p) return
    if (p.protected_hours_enabled !== undefined) setEnabled(p.protected_hours_enabled)
    if (p.protected_start_day !== undefined) setStartDay(p.protected_start_day)
    if (p.protected_start_time) setStartTime(p.protected_start_time)
    if (p.protected_end_day !== undefined) setEndDay(p.protected_end_day)
    if (p.protected_end_time) setEndTime(p.protected_end_time)
  }, [prefsData])

  async function save(patch: object) {
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...prefsData?.preferences, ...patch }),
    })
    mutatePrefs()
    setSaving(false)
  }

  async function handleToggle() {
    const next = !enabled
    setEnabled(next)
    await save({ protected_hours_enabled: next })
  }

  async function handleSave() {
    await save({ protected_start_day: startDay, protected_start_time: startTime, protected_end_day: endDay, protected_end_time: endTime })
    setEditing(false)
  }

  const label = `${DAYS[startDay]} ${fmt12(startTime)} → ${DAYS[endDay]} ${fmt12(endTime)}`

  return (
    <div className={`border rounded-xl p-4 transition-colors ${enabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${enabled ? 'bg-white border-indigo-200' : 'bg-slate-100 border-slate-200'}`}>
          <ShieldCheck size={16} className={enabled ? 'text-indigo-600' : 'text-slate-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Protected Hours</span>
            {/* Toggle */}
            <button
              onClick={handleToggle}
              disabled={saving}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className={`text-xs mt-0.5 ${enabled ? 'text-indigo-500' : 'text-slate-400'}`}>
            {enabled ? 'Off-limits for work staffing' : 'Click toggle to re-enable'}
          </p>
        </div>
      </div>

      {enabled && (
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium">
              🛡️ {label}
            </span>
            <button onClick={() => setEditing(e => !e)} className="text-xs text-indigo-400 hover:text-indigo-600 font-medium underline underline-offset-2">
              Edit
            </button>
          </div>

          {editing && (
            <div className="mt-3 pt-3 border-t border-indigo-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start day</label>
                  <select value={startDay} onChange={e => setStartDay(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End day</label>
                  <select value={endDay} onChange={e => setEndDay(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <Button size="sm" onClick={handleSave} loading={saving} className="w-full">Save</Button>
            </div>
          )}
        </div>
      )}

      {!enabled && (
        <p className="mt-2 text-xs text-slate-400 italic">Protection off — this window is treated as normal hours</p>
      )}
    </div>
  )
}

export default function FreeTimePage() {
  const { suggestions, loading, refresh } = useFreeTime(7)
  const { data: profileData } = useSWR('/api/profile', (url: string) => fetch(url).then((r) => r.json()))
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

        <ProtectedHoursCard />

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
