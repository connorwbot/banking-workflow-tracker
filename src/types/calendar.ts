export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  status?: 'confirmed' | 'tentative' | 'cancelled'
  colorId?: string
  htmlLink?: string
}

export interface CalendarEventsResponse {
  items: GoogleCalendarEvent[]
  nextPageToken?: string
}

export interface CreateEventPayload {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  colorId?: string
}
