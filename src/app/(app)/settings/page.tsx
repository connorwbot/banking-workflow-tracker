'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, Link2, Link2Off } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function SettingsPage() {
  const router = useRouter()
  const { data: profile, isLoading: profileLoading } = useSWR('/api/profile', fetcher)
  const { data: prefsData, isLoading: prefsLoading } = useSWR('/api/preferences', fetcher)

  const [prefs, setPrefs] = useState({
    gym_preferred_start: '06:00',
    gym_preferred_end: '09:00',
    gym_duration_mins: 60,
    gym_days: [1, 3, 5],
    lunch_start: '12:00',
    lunch_end: '13:30',
    dinner_start: '18:30',
    dinner_end: '21:00',
    focus_min_duration_mins: 90,
    work_day_start: '08:00',
    work_day_end: '22:00',
    timezone: 'America/New_York',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (prefsData?.preferences) {
      setPrefs((p) => ({ ...p, ...prefsData.preferences }))
    }
  }, [prefsData])

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const connected = urlParams?.get('connected') === 'true' || !!profile?.google_access_token

  function toggleGymDay(day: number) {
    setPrefs((p) => ({
      ...p,
      gym_days: p.gym_days.includes(day) ? p.gym_days.filter((d) => d !== day) : [...p.gym_days, day],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
    mutate('/api/preferences')
  }

  async function disconnectGoogle() {
    await fetch('/api/auth/google/disconnect', { method: 'POST' })
    mutate('/api/profile')
    router.refresh()
  }

  if (profileLoading || prefsLoading) {
    return <div className="p-6 space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" />

      <div className="flex-1 px-4 py-5 lg:px-6 max-w-xl space-y-6">
        {/* Google Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Google Calendar</h2>
          {connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check size={16} className="text-green-500" />
                <span>Connected{profile?.email ? ` as ${profile.email}` : ''}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={disconnectGoogle}>
                <Link2Off size={14} className="mr-1" /> Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Not connected</p>
              <a href="/api/auth/google">
                <Button size="sm">
                  <Link2 size={14} className="mr-1" /> Connect
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Preferences form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Work Hours</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start</label>
                <input type="time" value={prefs.work_day_start} onChange={(e) => setPrefs((p) => ({ ...p, work_day_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End</label>
                <input type="time" value={prefs.work_day_end} onChange={(e) => setPrefs((p) => ({ ...p, work_day_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Timezone</label>
              <select value={prefs.timezone} onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="Europe/London">London (GMT)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Gym Preferences</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Preferred days</label>
              <div className="flex gap-1.5">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleGymDay(i)}
                    className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${prefs.gym_days.includes(i) ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Window start</label>
                <input type="time" value={prefs.gym_preferred_start} onChange={(e) => setPrefs((p) => ({ ...p, gym_preferred_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Window end</label>
                <input type="time" value={prefs.gym_preferred_end} onChange={(e) => setPrefs((p) => ({ ...p, gym_preferred_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Duration (minutes)</label>
              <input type="number" min={30} max={180} value={prefs.gym_duration_mins} onChange={(e) => setPrefs((p) => ({ ...p, gym_duration_mins: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">Meal Times</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lunch start</label>
                <input type="time" value={prefs.lunch_start} onChange={(e) => setPrefs((p) => ({ ...p, lunch_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Lunch end</label>
                <input type="time" value={prefs.lunch_end} onChange={(e) => setPrefs((p) => ({ ...p, lunch_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dinner start</label>
                <input type="time" value={prefs.dinner_start} onChange={(e) => setPrefs((p) => ({ ...p, dinner_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dinner end</label>
                <input type="time" value={prefs.dinner_end} onChange={(e) => setPrefs((p) => ({ ...p, dinner_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Focus Blocks</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Minimum duration (minutes)</label>
              <input type="number" min={30} max={240} value={prefs.focus_min_duration_mins} onChange={(e) => setPrefs((p) => ({ ...p, focus_min_duration_mins: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <Button type="submit" loading={saving} className="w-full">
            {saved ? <><Check size={14} className="mr-1.5" /> Saved!</> : 'Save preferences'}
          </Button>
        </form>
      </div>
    </div>
  )
}
