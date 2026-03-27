import { parseISO, getDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { GoogleCalendarEvent } from '@/types/calendar'
import type { UserPreferences, FreeTimeSuggestion } from '@/types/database'

interface TimeBlock {
  start: Date
  end: Date
  tentative?: boolean
}

interface SuggestedSlot {
  suggestion_date: string
  slot_type: 'gym' | 'lunch' | 'dinner' | 'focus_block'
  start_time: Date
  end_time: Date
  duration_mins: number
  confidence: 'high' | 'medium' | 'low'
}

function parseTime(dateStr: string, timeStr: string, tz: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const local = new Date(dateStr)
  local.setHours(h, m, 0, 0)
  return fromZonedTime(local, tz)
}

function toMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  if (blocks.length === 0) return []
  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: TimeBlock[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i].start <= last.end) {
      last.end = sorted[i].end > last.end ? sorted[i].end : last.end
      last.tentative = last.tentative && sorted[i].tentative
    } else {
      merged.push({ ...sorted[i] })
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

function assessConfidence(gap: TimeBlock, slotStart: Date, slotEnd: Date, blocks: TimeBlock[]): 'high' | 'medium' | 'low' {
  const bufferMs = 30 * 60 * 1000
  const preBuffer = slotStart.getTime() - gap.start.getTime()
  const postBuffer = gap.end.getTime() - slotEnd.getTime()

  const surroundingTentative = blocks.some(
    (b) =>
      b.tentative &&
      ((b.start >= slotStart && b.start <= slotEnd) ||
        (b.end >= slotStart && b.end <= slotEnd))
  )

  if (surroundingTentative) return 'low'
  if (preBuffer < bufferMs || postBuffer < bufferMs) return 'medium'
  return 'high'
}

export function findFreeSlots(
  events: GoogleCalendarEvent[],
  prefs: UserPreferences,
  targetDates: string[]
): Omit<FreeTimeSuggestion, 'id' | 'user_id' | 'gcal_conflict' | 'dismissed' | 'gcal_event_id' | 'created_at'>[] {
  const results: ReturnType<typeof findFreeSlots> = []
  const tz = prefs.timezone

  for (const dateStr of targetDates) {
    const localDate = toZonedTime(parseISO(dateStr), tz)
    const dayOfWeek = getDay(localDate)

    // Collect events for this day
    const dayBlocks: TimeBlock[] = []
    for (const ev of events) {
      const evStart = ev.start.dateTime ? parseISO(ev.start.dateTime) : null
      const evEnd = ev.end.dateTime ? parseISO(ev.end.dateTime) : null
      if (!evStart || !evEnd) continue

      const evStartLocal = toZonedTime(evStart, tz)
      const evEndLocal = toZonedTime(evEnd, tz)
      const evDateStr = `${evStartLocal.getFullYear()}-${String(evStartLocal.getMonth() + 1).padStart(2, '0')}-${String(evStartLocal.getDate()).padStart(2, '0')}`

      if (evDateStr === dateStr) {
        dayBlocks.push({
          start: evStart,
          end: evEnd,
          tentative: ev.status === 'tentative',
        })
      }
    }

    const merged = mergeBlocks(dayBlocks)
    const dayStart = parseTime(dateStr, prefs.work_day_start, tz)
    const dayEnd = parseTime(dateStr, prefs.work_day_end, tz)
    const gaps = computeGaps(merged, dayStart, dayEnd)

    for (const gap of gaps) {
      const gapMins = (gap.end.getTime() - gap.start.getTime()) / 60000

      // Gym slot
      if (prefs.gym_days.includes(dayOfWeek)) {
        const gymStart = parseTime(dateStr, prefs.gym_preferred_start, tz)
        const gymEnd = parseTime(dateStr, prefs.gym_preferred_end, tz)
        const gymDur = prefs.gym_duration_mins

        const overlapStart = gap.start < gymEnd && gap.end > gymStart
          ? (gap.start > gymStart ? gap.start : gymStart)
          : null

        if (overlapStart) {
          const slotStart = overlapStart
          const slotEnd = new Date(slotStart.getTime() + gymDur * 60000)
          if (slotEnd <= gap.end && slotEnd <= gymEnd) {
            results.push({
              suggestion_date: dateStr,
              slot_type: 'gym',
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              duration_mins: gymDur,
              confidence: assessConfidence(gap, slotStart, slotEnd, merged),
            })
          }
        }
      }

      // Lunch slot
      const lunchStart = parseTime(dateStr, prefs.lunch_start, tz)
      const lunchEnd = parseTime(dateStr, prefs.lunch_end, tz)
      const lunchDur = 60

      const lunchOverlapStart = gap.start < lunchEnd && gap.end > lunchStart
        ? (gap.start > lunchStart ? gap.start : lunchStart)
        : null

      if (lunchOverlapStart && gapMins >= 45) {
        const slotStart = lunchOverlapStart
        const slotEnd = new Date(slotStart.getTime() + lunchDur * 60000)
        if (slotEnd <= gap.end && slotEnd <= lunchEnd) {
          results.push({
            suggestion_date: dateStr,
            slot_type: 'lunch',
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            duration_mins: lunchDur,
            confidence: assessConfidence(gap, slotStart, slotEnd, merged),
          })
        }
      }

      // Dinner slot
      const dinnerStart = parseTime(dateStr, prefs.dinner_start, tz)
      const dinnerEnd = parseTime(dateStr, prefs.dinner_end, tz)
      const dinnerDur = 60

      const dinnerOverlapStart = gap.start < dinnerEnd && gap.end > dinnerStart
        ? (gap.start > dinnerStart ? gap.start : dinnerStart)
        : null

      if (dinnerOverlapStart && gapMins >= 45) {
        const slotStart = dinnerOverlapStart
        const slotEnd = new Date(slotStart.getTime() + dinnerDur * 60000)
        if (slotEnd <= gap.end && slotEnd <= dinnerEnd) {
          results.push({
            suggestion_date: dateStr,
            slot_type: 'dinner',
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            duration_mins: dinnerDur,
            confidence: assessConfidence(gap, slotStart, slotEnd, merged),
          })
        }
      }

      // Focus blocks (remaining gap, outside meal/gym windows)
      const minFocus = prefs.focus_min_duration_mins
      if (gapMins >= minFocus) {
        const breakMins = 15
        if (gapMins > 180) {
          // Split into two focus blocks
          const block1End = new Date(gap.start.getTime() + Math.floor(gapMins / 2) * 60000)
          const block2Start = new Date(block1End.getTime() + breakMins * 60000)
          results.push(
            {
              suggestion_date: dateStr,
              slot_type: 'focus_block',
              start_time: gap.start.toISOString(),
              end_time: block1End.toISOString(),
              duration_mins: Math.floor(gapMins / 2),
              confidence: assessConfidence(gap, gap.start, block1End, merged),
            },
            {
              suggestion_date: dateStr,
              slot_type: 'focus_block',
              start_time: block2Start.toISOString(),
              end_time: gap.end.toISOString(),
              duration_mins: Math.floor((gap.end.getTime() - block2Start.getTime()) / 60000),
              confidence: assessConfidence(gap, block2Start, gap.end, merged),
            }
          )
        } else {
          results.push({
            suggestion_date: dateStr,
            slot_type: 'focus_block',
            start_time: gap.start.toISOString(),
            end_time: gap.end.toISOString(),
            duration_mins: Math.floor(gapMins),
            confidence: assessConfidence(gap, gap.start, gap.end, merged),
          })
        }
      }
    }
  }

  return results
}
