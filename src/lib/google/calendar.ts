import type { GoogleCalendarEvent, CalendarEventsResponse, CreateEventPayload } from '@/types/calendar'

const BASE = 'https://www.googleapis.com/calendar/v3'

export async function listEvents(
  accessToken: string,
  calendarId = 'primary',
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await fetch(`${BASE}/calendars/${calendarId}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`GCal list events failed: ${res.statusText}`)
  const data: CalendarEventsResponse = await res.json()
  return data.items ?? []
}

export async function createEvent(
  accessToken: string,
  calendarId = 'primary',
  payload: CreateEventPayload
): Promise<GoogleCalendarEvent> {
  const res = await fetch(`${BASE}/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`GCal create event failed: ${res.statusText}`)
  return res.json()
}

export async function deleteEvent(
  accessToken: string,
  calendarId = 'primary',
  eventId: string
): Promise<void> {
  const res = await fetch(`${BASE}/calendars/${calendarId}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 410) {
    throw new Error(`GCal delete event failed: ${res.statusText}`)
  }
}
