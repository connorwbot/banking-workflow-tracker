import useSWR from 'swr'
import type { GoogleCalendarEvent } from '@/types/calendar'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useCalendarEvents(start?: Date, end?: Date) {
  const s = start ? start.toISOString() : new Date().toISOString()
  const e = end ? end.toISOString() : new Date(Date.now() + 7 * 86400000).toISOString()

  const { data, error, isLoading } = useSWR<{ events: GoogleCalendarEvent[]; connected: boolean }>(
    `/api/calendar/events?start=${s}&end=${e}`,
    fetcher,
    { revalidateOnFocus: true }
  )

  return {
    events: data?.events ?? [],
    connected: data?.connected ?? false,
    loading: isLoading,
    error,
  }
}

export function useTodayEvents() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return useCalendarEvents(today, tomorrow)
}
