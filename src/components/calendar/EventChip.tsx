import { formatTime } from '@/lib/utils/date'
import type { GoogleCalendarEvent } from '@/types/calendar'

export function EventChip({ event }: { event: GoogleCalendarEvent }) {
  const start = event.start.dateTime ? new Date(event.start.dateTime) : null
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
      {start && (
        <span className="text-xs text-blue-500 font-medium flex-shrink-0">{formatTime(start)}</span>
      )}
      <span className="text-sm text-slate-700 truncate">{event.summary}</span>
      {start && end && (
        <span className="text-xs text-slate-400 flex-shrink-0 ml-auto">
          {Math.round((end.getTime() - start.getTime()) / 60000)}m
        </span>
      )}
    </div>
  )
}
