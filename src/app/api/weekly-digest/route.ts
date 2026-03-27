import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/token-refresh'
import { listEvents } from '@/lib/google/calendar'
import { NextResponse } from 'next/server'
import { startOfWeek, endOfWeek, format, addDays, eachDayOfInterval } from 'date-fns'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const weekParam = searchParams.get('week') // e.g. '2026-03-23'
  const refDate = weekParam ? new Date(weekParam) : new Date()

  const monday = startOfWeek(refDate, { weekStartsOn: 1 })
  const sunday = endOfWeek(refDate, { weekStartsOn: 1 })
  const monStr = format(monday, 'yyyy-MM-dd')
  const sunStr = format(sunday, 'yyyy-MM-dd')

  const [subtasksRes, projectsRes, standupRes, pipelineRes, profileRes] = await Promise.all([
    supabase.from('subtasks').select('*, project:projects(name,color,type)').eq('user_id', user.id)
      .gte('due_date', monStr).lte('due_date', sunStr).eq('completed', false)
      .order('due_date', { ascending: true }),
    supabase.from('projects').select('*').eq('user_id', user.id)
      .gte('due_date', monStr).lte('due_date', sunStr),
    supabase.from('standup_logs').select('*').eq('user_id', user.id)
      .gte('log_date', monStr).lte('log_date', sunStr),
    supabase.from('pipeline_deals').select('*, project:projects(*), stage:pipeline_stages(*)').eq('user_id', user.id),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  // Availability by day: count events per day from GCal
  let availabilityByDay: Record<string, number> = {}
  const days = eachDayOfInterval({ start: monday, end: sunday })
  days.forEach((d) => { availabilityByDay[format(d, 'yyyy-MM-dd')] = 0 })

  if (profileRes.data?.google_access_token) {
    try {
      const token = await getValidAccessToken(supabase, profileRes.data)
      const events = await listEvents(token, profileRes.data.google_calendar_id ?? 'primary', monday.toISOString(), addDays(sunday, 1).toISOString())
      events.forEach((ev) => {
        if (ev.start.dateTime) {
          const d = format(new Date(ev.start.dateTime), 'yyyy-MM-dd')
          if (d in availabilityByDay) availabilityByDay[d]++
        }
      })
    } catch {}
  }

  return NextResponse.json({
    week: { start: monStr, end: sunStr },
    subtasks: subtasksRes.data ?? [],
    projects: projectsRes.data ?? [],
    standups: standupRes.data ?? [],
    pipeline: pipelineRes.data ?? [],
    availabilityByDay,
  })
}
