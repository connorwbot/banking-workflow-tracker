'use client'

import { useState } from 'react'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { WeekStrip } from '@/components/calendar/WeekStrip'
import { EventChip } from '@/components/calendar/EventChip'
import { ConnectGoogleBanner } from '@/components/calendar/ConnectGoogleBanner'
import { Skeleton } from '@/components/ui/Skeleton'
import { format, addDays, startOfWeek } from 'date-fns'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

export function CalendarMiniView() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const { events, connected, loading } = useCalendarEvents(monday, addDays(monday, 7))

  const dayStr = format(selectedDate, 'yyyy-MM-dd')
  const dayEvents = events
    .filter((ev) => {
      const evDate = ev.start.dateTime
        ? format(new Date(ev.start.dateTime), 'yyyy-MM-dd')
        : ev.start.date
      return evDate === dayStr
    })
    .sort((a, b) => {
      const aTime = a.start.dateTime ?? a.start.date ?? ''
      const bTime = b.start.dateTime ?? b.start.date ?? ''
      return aTime.localeCompare(bTime)
    })

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-slate-800 text-sm">Calendar</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected && !loading && <ConnectGoogleBanner />}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <WeekStrip events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <div>
              <p className="text-xs text-slate-500 font-medium mb-2">
                {format(selectedDate, 'EEEE, MMMM d')}
              </p>
              {dayEvents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">No events</p>
              ) : (
                <div className="space-y-1.5">
                  {dayEvents.slice(0, 5).map((ev) => <EventChip key={ev.id} event={ev} />)}
                  {dayEvents.length > 5 && (
                    <p className="text-xs text-slate-400 text-center">+{dayEvents.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
