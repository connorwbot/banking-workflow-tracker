import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/google/token-refresh'
import { listEvents, createEvent, deleteEvent } from '@/lib/google/calendar'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start') ?? new Date().toISOString()
  const end = searchParams.get('end') ?? new Date(Date.now() + 7 * 86400000).toISOString()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.google_access_token) {
    return NextResponse.json({ events: [], connected: false })
  }

  try {
    const token = await getValidAccessToken(supabase, profile)
    const events = await listEvents(token, profile.google_calendar_id ?? 'primary', start, end)
    return NextResponse.json({ events, connected: true })
  } catch (err) {
    console.error('Calendar fetch error:', err)
    return NextResponse.json({ events: [], connected: false, error: String(err) })
  }
}

const CreateEventSchema = z.object({
  summary: z.string().min(1),
  start: z.string(),
  end: z.string(),
  description: z.string().optional(),
  colorId: z.string().optional(),
  suggestionId: z.string().uuid().optional(),
  subtaskId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  const prefs = await supabase.from('user_preferences').select('timezone').eq('user_id', user.id).single()
  const tz = prefs.data?.timezone ?? 'America/New_York'

  try {
    const token = await getValidAccessToken(supabase, profile)
    const event = await createEvent(token, profile.google_calendar_id ?? 'primary', {
      summary: parsed.data.summary,
      description: parsed.data.description,
      start: { dateTime: parsed.data.start, timeZone: tz },
      end: { dateTime: parsed.data.end, timeZone: tz },
      colorId: parsed.data.colorId,
    })

    if (parsed.data.suggestionId) {
      await supabase
        .from('free_time_suggestions')
        .update({ gcal_event_id: event.id })
        .eq('id', parsed.data.suggestionId)
        .eq('user_id', user.id)
    }

    if (parsed.data.subtaskId) {
      await supabase
        .from('subtasks')
        .update({ gcal_event_id: event.id, updated_at: new Date().toISOString() })
        .eq('id', parsed.data.subtaskId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ event })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

const DeleteEventSchema = z.object({
  eventId: z.string().min(1),
  subtaskId: z.string().uuid().optional(),
  suggestionId: z.string().uuid().optional(),
})

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = DeleteEventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile?.google_access_token) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  try {
    const token = await getValidAccessToken(supabase, profile)
    await deleteEvent(token, profile.google_calendar_id ?? 'primary', parsed.data.eventId)

    if (parsed.data.subtaskId) {
      await supabase
        .from('subtasks')
        .update({ gcal_event_id: null, updated_at: new Date().toISOString() })
        .eq('id', parsed.data.subtaskId)
        .eq('user_id', user.id)
    }

    if (parsed.data.suggestionId) {
      await supabase
        .from('free_time_suggestions')
        .update({ gcal_event_id: null })
        .eq('id', parsed.data.suggestionId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
