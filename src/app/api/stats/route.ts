import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/token-refresh'
import { listEvents } from '@/lib/google/calendar'
import { NextResponse } from 'next/server'
import { format, addDays } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = format(new Date(), 'yyyy-MM-dd')
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const [tasksRes, pitchRes, dealRes, profileRes] = await Promise.all([
    supabase.from('subtasks').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('completed', false).eq('due_date', today),
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'pitch').eq('status', 'active'),
    supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('type', 'live_deal').eq('status', 'active'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  let freeHoursToday = 0
  if (profileRes.data?.google_access_token) {
    try {
      const prefs = await supabase.from('user_preferences').select('work_day_start,work_day_end').eq('user_id', user.id).single()
      const workStart = prefs.data?.work_day_start ?? '08:00'
      const workEnd = prefs.data?.work_day_end ?? '22:00'
      const [sh, sm] = workStart.split(':').map(Number)
      const [eh, em] = workEnd.split(':').map(Number)
      const workMins = (eh * 60 + em) - (sh * 60 + sm)

      const token = await getValidAccessToken(supabase, profileRes.data)
      const events = await listEvents(token, profileRes.data.google_calendar_id ?? 'primary', todayStart.toISOString(), todayEnd.toISOString())

      const busyMins = events.reduce((acc, ev) => {
        if (ev.start.dateTime && ev.end.dateTime) {
          return acc + (new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / 60000
        }
        return acc
      }, 0)

      freeHoursToday = Math.max(0, Math.round((workMins - busyMins) / 60))
    } catch {}
  }

  return NextResponse.json({
    tasksToday: tasksRes.count ?? 0,
    activePitches: pitchRes.count ?? 0,
    activeDeals: dealRes.count ?? 0,
    freeHoursToday,
  })
}
