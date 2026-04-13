import { addDays, format, parseISO, startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { GoogleCalendarEvent } from '@/types/calendar'

interface SchedulerPrefs {
  timezone: string
  work_day_start: string
  work_day_end: string
  protected_hours_enabled?: boolean
  protected_start_day?: number
  protected_start_time?: string
  protected_end_day?: number
  protected_end_time?: string
}

interface SchedulerTask {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  due_time: string | null
  expected_hours: number | null
  project_id: string
  project_name: string | null
  project_color: string | null
}

interface TimeBlock {
  start: Date
  end: Date
}

export interface ScheduledTaskSlot {
  task_id: string
  title: string
  project_id: string
  project_name: string | null
  project_color: string | null
  start: string
  end: string
  duration_mins: number
  due_date: string | null
  due_time: string | null
  reason: string
}

function parseTime(dateStr: string, timeStr: string, tz: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const local = new Date(`${dateStr}T12:00:00`)
  local.setHours(h, m, 0, 0)
  return fromZonedTime(local, tz)
}

function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length === 0) return []
  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: TimeBlock[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const current = sorted[i]
    if (current.start <= last.end) {
      last.end = current.end > last.end ? current.end : last.end
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

function computeGaps(blocks: TimeBlock[], dayStart: Date, dayEnd: Date): TimeBlock[] {
  const gaps: TimeBlock[] = []
  let cursor = dayStart

  for (const block of blocks) {
    if (block.start > cursor) {
      gaps.push({ start: cursor, end: block.start })
    }
    cursor = block.end > cursor ? block.end : cursor
  }

  if (cursor < dayEnd) {
    gaps.push({ start: cursor, end: dayEnd })
  }

  return gaps
}

function eventToBlock(event: GoogleCalendarEvent, tz: string): TimeBlock | null {
  if (event.status === 'cancelled') return null

  if (event.start.dateTime && event.end.dateTime) {
    return {
      start: parseISO(event.start.dateTime),
      end: parseISO(event.end.dateTime),
    }
  }

  if (event.start.date && event.end.date) {
    return {
      start: fromZonedTime(new Date(`${event.start.date}T00:00:00`), tz),
      end: fromZonedTime(new Date(`${event.end.date}T00:00:00`), tz),
    }
  }

  return null
}

function durationMins(task: SchedulerTask) {
  if (task.expected_hours && task.expected_hours > 0) {
    return Math.max(15, Math.round(task.expected_hours * 60))
  }
  if (task.priority === 'urgent') return 60
  if (task.priority === 'high') return 45
  return 30
}

function taskPriorityWeight(priority: SchedulerTask['priority']) {
  if (priority === 'urgent') return 0
  if (priority === 'high') return 1
  if (priority === 'medium') return 2
  return 3
}

function latestAllowedEnd(task: SchedulerTask, prefs: SchedulerPrefs, horizonEnd: Date) {
  if (!task.due_date) return horizonEnd
  const fallbackTime = task.due_time ?? prefs.work_day_end
  return parseTime(task.due_date, fallbackTime, prefs.timezone)
}

function isProtected(start: Date, end: Date, prefs: SchedulerPrefs): boolean {
  if (!prefs.protected_hours_enabled) return false
  if (
    prefs.protected_start_day == null ||
    !prefs.protected_start_time ||
    prefs.protected_end_day == null ||
    !prefs.protected_end_time
  ) {
    return false
  }

  const tz = prefs.timezone
  const slotStartLocal = toZonedTime(start, tz)
  const slotDow = slotStartLocal.getDay()
  const daysDiff = (slotDow - prefs.protected_start_day + 7) % 7
  const windowStartLocal = new Date(slotStartLocal)
  windowStartLocal.setDate(windowStartLocal.getDate() - daysDiff)
  const [sh, sm] = prefs.protected_start_time.split(':').map(Number)
  windowStartLocal.setHours(sh, sm, 0, 0)
  const windowStart = fromZonedTime(windowStartLocal, tz)

  const windowEndLocal = new Date(windowStartLocal)
  let endDaysDiff = (prefs.protected_end_day - prefs.protected_start_day + 7) % 7
  if (endDaysDiff === 0) endDaysDiff = 7
  windowEndLocal.setDate(windowEndLocal.getDate() + endDaysDiff)
  const [eh, em] = prefs.protected_end_time.split(':').map(Number)
  windowEndLocal.setHours(eh, em, 0, 0)
  const windowEnd = fromZonedTime(windowEndLocal, tz)

  return start < windowEnd && end > windowStart
}

export function scheduleTasksAroundEvents(
  tasks: SchedulerTask[],
  events: GoogleCalendarEvent[],
  prefs: SchedulerPrefs,
  days: number
): ScheduledTaskSlot[] {
  const now = new Date()
  const tz = prefs.timezone
  const horizonEnd = addDays(startOfDay(now), days + 1)

  const candidateTasks = [...tasks].sort((a, b) => {
    const aDeadline = latestAllowedEnd(a, prefs, horizonEnd).getTime()
    const bDeadline = latestAllowedEnd(b, prefs, horizonEnd).getTime()
    if (aDeadline !== bDeadline) return aDeadline - bDeadline
    const priorityDiff = taskPriorityWeight(a.priority) - taskPriorityWeight(b.priority)
    if (priorityDiff !== 0) return priorityDiff
    return durationMins(a) - durationMins(b)
  })

  const busyBlocks = mergeBlocks(
    events
      .map((event) => eventToBlock(event, tz))
      .filter((block): block is TimeBlock => Boolean(block))
  )

  const scheduled: ScheduledTaskSlot[] = []
  const reservedBlocks: TimeBlock[] = [...busyBlocks]

  for (const task of candidateTasks) {
    const mins = durationMins(task)
    const deadline = latestAllowedEnd(task, prefs, horizonEnd)
    let placed = false

    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const dayDate = addDays(now, dayOffset)
      const dayStr = format(dayDate, 'yyyy-MM-dd')
      const dayStart = parseTime(dayStr, prefs.work_day_start, tz)
      const dayEnd = parseTime(dayStr, prefs.work_day_end, tz)
      const cappedDayEnd = deadline < dayEnd ? deadline : dayEnd

      if (cappedDayEnd <= dayStart) continue

      const dayBlocks = mergeBlocks(
        reservedBlocks.filter((block) => block.end > dayStart && block.start < cappedDayEnd)
      )
      const gaps = computeGaps(dayBlocks, dayStart, cappedDayEnd)

      for (const gap of gaps) {
        const slotEnd = new Date(gap.start.getTime() + mins * 60000)
        if (slotEnd > gap.end) continue
        if (slotEnd <= now) continue
        if (isProtected(gap.start, slotEnd, prefs)) continue

        const reason =
          task.expected_hours && task.expected_hours > 0
            ? `Scheduled ${task.expected_hours}h around copied meetings`
            : 'Scheduled around copied meetings'

        scheduled.push({
          task_id: task.id,
          title: task.title,
          project_id: task.project_id,
          project_name: task.project_name,
          project_color: task.project_color,
          start: gap.start.toISOString(),
          end: slotEnd.toISOString(),
          duration_mins: mins,
          due_date: task.due_date,
          due_time: task.due_time,
          reason,
        })
        reservedBlocks.push({ start: gap.start, end: slotEnd })
        placed = true
        break
      }

      if (placed) break
    }
  }

  return scheduled.sort((a, b) => a.start.localeCompare(b.start))
}
