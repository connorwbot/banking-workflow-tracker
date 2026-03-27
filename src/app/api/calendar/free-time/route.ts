import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/token-refresh'
import { listEvents } from '@/lib/google/calendar'
import { findFreeSlots } from '@/lib/algorithms/free-time-finder'
import { NextResponse } from 'next/server'
import { format, addDays } from 'date-fns'

const DEFAULT_PREFS = {
  gym_preferred_start: '06:00', gym_preferred_end: '09:00', gym_duration_mins: 60,
  gym_days: [1, 3, 5], lunch_start: '12:00', lunch_end: '13:30',
  dinner_start: '18:30', dinner_end: '21:00', focus_min_duration_mins: 90,
  work_day_start: '08:00', work_day_end: '22:00', timezone: 'America/New_York',
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(Number(searchParams.get('days') ?? 7), 14)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: prefsRow } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single()
  const prefs = { ...DEFAULT_PREFS, ...(prefsRow ?? {}) }

  const today = new Date()
  const targetDates = Array.from({ length: days }, (_, i) => format(addDays(today, i), 'yyyy-MM-dd'))

  const start = today.toISOString()
  const end = addDays(today, days).toISOString()

  let suggestions: ReturnType<typeof findFreeSlots> = []

  if (profile?.google_access_token) {
    try {
      const token = await getValidAccessToken(supabase, profile)
      const events = await listEvents(token, profile.google_calendar_id ?? 'primary', start, end)
      suggestions = findFreeSlots(events, prefs as Parameters<typeof findFreeSlots>[1], targetDates)
    } catch {
      suggestions = findFreeSlots([], prefs as Parameters<typeof findFreeSlots>[1], targetDates)
    }
  } else {
    suggestions = findFreeSlots([], prefs as Parameters<typeof findFreeSlots>[1], targetDates)
  }

  // Upsert suggestions into DB
  if (suggestions.length > 0) {
    await supabase.from('free_time_suggestions').upsert(
      suggestions.map((s) => ({ ...s, user_id: user.id, gcal_conflict: false, dismissed: false })),
      { onConflict: 'user_id,suggestion_date,slot_type,start_time', ignoreDuplicates: true }
    )
  }

  // Return non-dismissed suggestions for requested range
  const { data: rows } = await supabase
    .from('free_time_suggestions')
    .select('*')
    .eq('user_id', user.id)
    .eq('dismissed', false)
    .gte('suggestion_date', format(today, 'yyyy-MM-dd'))
    .lte('suggestion_date', format(addDays(today, days - 1), 'yyyy-MM-dd'))
    .order('start_time', { ascending: true })

  return NextResponse.json({ suggestions: rows ?? [] })
}
