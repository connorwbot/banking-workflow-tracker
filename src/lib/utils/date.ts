import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatDateShort(date: string | Date) {
  return formatDate(date, 'MMM d')
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'h:mm a')
}

export function formatTimeRange(start: string | Date, end: string | Date) {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function dueDateLabel(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isPast(d)) return `Overdue (${formatDateShort(d)})`
  return formatDistanceToNow(d, { addSuffix: true })
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toUserTimezone(date: string | Date, tz: string) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(d, tz)
}

export function weekBounds(referenceDate: Date = new Date()) {
  const day = referenceDate.getDay()
  const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(referenceDate)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

export function sevenDayRange(from: Date = new Date()) {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  const end = new Date(from)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}
