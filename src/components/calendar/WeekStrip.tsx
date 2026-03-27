'use client'

import { format, addDays, startOfWeek, isToday } from 'date-fns'
import type { GoogleCalendarEvent } from '@/types/calendar'
import { cn } from '@/lib/utils/cn'

interface WeekStripProps {
  events: GoogleCalendarEvent[]
  selectedDate: Date
  onSelectDate: (d: Date) => void
}

export function WeekStrip({ events, selectedDate, onSelectDate }: WeekStripProps) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  function eventsForDay(d: Date) {
    const str = format(d, 'yyyy-MM-dd')
    return events.filter((ev) => {
      const evDate = ev.start.dateTime
        ? format(new Date(ev.start.dateTime), 'yyyy-MM-dd')
        : ev.start.date
      return evDate === str
    })
  }

  return (
    <div className="flex gap-1">
      {days.map((d) => {
        const count = eventsForDay(d).length
        const today = isToday(d)
        const selected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelectDate(d)}
            className={cn(
              'flex-1 flex flex-col items-center py-2 rounded-xl transition-colors',
              selected ? 'bg-blue-600' : today ? 'bg-blue-50' : 'hover:bg-slate-50'
            )}
          >
            <span className={cn('text-xs font-medium', selected ? 'text-blue-100' : 'text-slate-400')}>
              {format(d, 'EEE')}
            </span>
            <span className={cn('text-sm font-bold mt-0.5', selected ? 'text-white' : today ? 'text-blue-600' : 'text-slate-700')}>
              {format(d, 'd')}
            </span>
            {count > 0 && (
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1', selected ? 'bg-blue-200' : 'bg-blue-400')} />
            )}
          </button>
        )
      })}
    </div>
  )
}
