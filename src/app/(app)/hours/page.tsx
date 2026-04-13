'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/layout/Header'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  format, parseISO, eachDayOfInterval, startOfWeek, isWeekend, isBefore,
} from 'date-fns'
import { cn } from '@/lib/utils/cn'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const INTERNSHIP_DEFAULT = '2026-05-04'

type ViewMode = 'daily' | 'weekly'

// ─── Helpers ────────────────────────────────────────────────────────────────

function allDays(startDate: string): string[] {
  const start = parseISO(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (isBefore(today, start)) return []
  return eachDayOfInterval({ start, end: today }).map((d) => format(d, 'yyyy-MM-dd'))
}

type WeekGroup = { weekStart: string; days: string[] }

function groupByWeek(days: string[]): WeekGroup[] {
  const weeks: WeekGroup[] = []
  let cur: WeekGroup | null = null
  for (const day of days) {
    const ws = format(startOfWeek(parseISO(day), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    if (!cur || cur.weekStart !== ws) {
      cur = { weekStart: ws, days: [] }
      weeks.push(cur)
    }
    cur.days.push(day)
  }
  return weeks
}

function buildMap(entries: { date: string; hours: number | null }[]): Record<string, number | null> {
  const m: Record<string, number | null> = {}
  entries.forEach((e) => { m[e.date] = e.hours })
  return m
}

// ─── Chart ──────────────────────────────────────────────────────────────────

const CHART_H = 200
const LABEL_H = 24
const SVG_H = CHART_H + LABEL_H
const Y_AXIS_W = 36

function yPos(val: number, yMax: number) {
  return CHART_H - (val / yMax) * CHART_H
}

function HoursChart({
  days,
  hoursMap,
  view,
}: {
  days: string[]
  hoursMap: Record<string, number | null>
  view: ViewMode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [view, days.length])

  if (view === 'daily') {
    const BAR_W = 14
    const BAR_GAP = 4
    const STEP = BAR_W + BAR_GAP

    const rawMax = Math.max(...days.map((d) => hoursMap[d] ?? 0), 4)
    const yMax = Math.ceil(rawMax / 4) * 4
    const yTicks = Array.from({ length: Math.floor(yMax / 4) + 1 }, (_, i) => i * 4)
    const totalW = days.length * STEP

    return (
      <div className="flex" style={{ height: SVG_H }}>
        {/* Fixed Y-axis */}
        <svg width={Y_AXIS_W} height={SVG_H} className="flex-shrink-0">
          {yTicks.map((tick) => (
            <text key={tick} x={Y_AXIS_W - 4} y={yPos(tick, yMax) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
              {tick}
            </text>
          ))}
        </svg>
        {/* Scrollable bars */}
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <svg width={Math.max(totalW, 10)} height={SVG_H}>
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <line key={tick} x1={0} x2={totalW} y1={yPos(tick, yMax)} y2={yPos(tick, yMax)} stroke="#f1f5f9" strokeWidth={1} />
            ))}
            {/* Bars */}
            {days.map((day, i) => {
              const h = hoursMap[day] ?? 0
              const weekend = isWeekend(parseISO(day))
              const bh = (h / yMax) * CHART_H
              return (
                <g key={day}>
                  {h > 0 && (
                    <rect
                      x={i * STEP}
                      y={yPos(h, yMax)}
                      width={BAR_W}
                      height={bh}
                      fill={weekend ? '#cbd5e1' : '#3b82f6'}
                      rx={2}
                    >
                      <title>{format(parseISO(day), 'EEE MMM d')}: {h} hrs</title>
                    </rect>
                  )}
                  {i % 7 === 0 && (
                    <text
                      x={i * STEP + BAR_W / 2}
                      y={CHART_H + 16}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#94a3b8"
                    >
                      {format(parseISO(day), 'M/d')}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    )
  }

  // Weekly view
  const weeks = groupByWeek(days)
  const BAR_W = 36
  const BAR_GAP = 8
  const STEP = BAR_W + BAR_GAP
  const REF = 80

  const weekTotals = weeks.map((w) => ({
    weekStart: w.weekStart,
    total: w.days.reduce((sum, d) => sum + (hoursMap[d] ?? 0), 0),
  }))

  const rawMax = Math.max(...weekTotals.map((w) => w.total), REF + 10)
  const yMax = Math.ceil(rawMax / 20) * 20
  const yTicks = Array.from({ length: Math.floor(yMax / 20) + 1 }, (_, i) => i * 20)
  const totalW = weekTotals.length * STEP

  return (
    <div className="flex" style={{ height: SVG_H }}>
      <svg width={Y_AXIS_W} height={SVG_H} className="flex-shrink-0">
        {yTicks.map((tick) => (
          <text key={tick} x={Y_AXIS_W - 4} y={yPos(tick, yMax) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
            {tick}
          </text>
        ))}
      </svg>
      <div ref={scrollRef} className="overflow-x-auto flex-1">
        <svg width={Math.max(totalW, 10)} height={SVG_H}>
          {yTicks.map((tick) => (
            <line key={tick} x1={0} x2={totalW} y1={yPos(tick, yMax)} y2={yPos(tick, yMax)} stroke="#f1f5f9" strokeWidth={1} />
          ))}
          {/* 80-hour reference line */}
          <line
            x1={0} x2={totalW}
            y1={yPos(REF, yMax)} y2={yPos(REF, yMax)}
            stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 4"
          />
          <text x={4} y={yPos(REF, yMax) - 4} fontSize={9} fill="#ef4444">80 hr cap</text>
          {weekTotals.map((w, i) => {
            const bh = (w.total / yMax) * CHART_H
            return (
              <g key={w.weekStart}>
                {w.total > 0 && (
                  <rect
                    x={i * STEP}
                    y={yPos(w.total, yMax)}
                    width={BAR_W}
                    height={bh}
                    fill={w.total >= REF ? '#ef4444' : '#3b82f6'}
                    rx={3}
                  >
                    <title>Week of {format(parseISO(w.weekStart), 'MMM d')}: {w.total} hrs</title>
                  </rect>
                )}
                <text
                  x={i * STEP + BAR_W / 2}
                  y={CHART_H + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {format(parseISO(w.weekStart), 'M/d')}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── Entry log ──────────────────────────────────────────────────────────────

function EntryLog({
  days,
  hoursMap,
  onSave,
}: {
  days: string[]
  hoursMap: Record<string, number | null>
  onSave: (date: string, hours: number | null) => Promise<void>
}) {
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const weeks = useMemo(() => [...groupByWeek(days)].reverse(), [days])

  async function save(date: string) {
    const h = editVal === '' ? null : Number(editVal)
    await onSave(date, isNaN(h as number) ? null : h)
    setEditingDate(null)
  }

  function startEdit(date: string) {
    const h = hoursMap[date]
    setEditingDate(date)
    setEditVal(h != null ? String(h) : '')
  }

  return (
    <div className="space-y-4">
      {weeks.map(({ weekStart, days: wDays }) => {
        const total = wDays.reduce((sum, d) => sum + (hoursMap[d] ?? 0), 0)
        return (
          <div key={weekStart}>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Week of {format(parseISO(weekStart), 'MMM d')}
              </h3>
              {total > 0 && (
                <span className={cn('text-xs font-medium', total >= 80 ? 'text-red-500' : 'text-slate-400')}>
                  {total} hrs{total >= 80 ? ' ⚠' : ''}
                </span>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {[...wDays].reverse().map((day) => {
                const h = hoursMap[day]
                const weekend = isWeekend(parseISO(day))
                const isEditing = editingDate === day
                return (
                  <div
                    key={day}
                    className={cn(
                      'flex items-center justify-between px-4 py-3',
                      weekend && 'bg-slate-50/60'
                    )}
                  >
                    <span className={cn('text-sm', weekend ? 'text-slate-400' : 'text-slate-700')}>
                      {format(parseISO(day), 'EEE, MMM d')}
                    </span>
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={() => save(day)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') save(day)
                          if (e.key === 'Escape') setEditingDate(null)
                        }}
                        className="w-24 text-right px-2 py-1 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="hrs"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(day)}
                        className={cn(
                          'text-sm px-3 py-1.5 rounded-lg transition-colors min-w-[60px] text-right',
                          h != null
                            ? 'text-slate-800 font-medium hover:bg-slate-100'
                            : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                        )}
                      >
                        {h != null ? `${h} hrs` : '—'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HoursPage() {
  const [view, setView] = useState<ViewMode>('daily')

  const { data: prefsData } = useSWR('/api/preferences', fetcher)
  const startDate: string = prefsData?.preferences?.internship_start_date ?? INTERNSHIP_DEFAULT
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const hoursUrl = `/api/hours?from=${startDate}&to=${todayStr}`
  const { data: hoursData, isLoading, mutate } = useSWR(hoursUrl, fetcher)

  const days = useMemo(() => allDays(startDate), [startDate])

  const hoursMap = useMemo(() => {
    const entries: { date: string; hours: number | null }[] = hoursData?.entries ?? []
    const m = buildMap(entries)
    // Fill in gaps with null
    days.forEach((d) => { if (!(d in m)) m[d] = null })
    return m
  }, [hoursData, days])

  const totalHours = useMemo(
    () => days.reduce((sum, d) => sum + (hoursMap[d] ?? 0), 0),
    [days, hoursMap]
  )

  const weeks = useMemo(() => groupByWeek(days), [days])
  const totalWeeks = Math.max(weeks.length, 1)
  const avgPerWeek = totalWeeks > 0 ? totalHours / totalWeeks : 0

  async function handleSave(date: string, hours: number | null) {
    await fetch('/api/hours', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, hours }),
    })
    mutate()
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Hours Tracker" />

      <div className="flex-1 px-4 py-5 lg:px-6 space-y-6 max-w-3xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalHours}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total hrs</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={cn('text-2xl font-bold', avgPerWeek > 80 ? 'text-red-500' : 'text-slate-900')}>
              {avgPerWeek.toFixed(0)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Avg hrs/wk</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalWeeks}</p>
            <p className="text-xs text-slate-500 mt-0.5">Weeks in</p>
          </div>
        </div>

        {/* Chart card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 text-sm">
              {view === 'daily' ? (
                <><span className="inline-block w-3 h-3 rounded-sm bg-blue-500 mr-1.5 align-middle" />Weekday <span className="inline-block w-3 h-3 rounded-sm bg-slate-300 mr-1.5 ml-2 align-middle" />Weekend</>
              ) : (
                <><span className="text-red-400">— —</span> 80 hr/week cap</>
              )}
            </h2>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(['daily', 'weekly'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize',
                    view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : days.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No days to display yet.</p>
          ) : (
            <HoursChart days={days} hoursMap={hoursMap} view={view} />
          )}
        </div>

        {/* Entry log */}
        <div>
          <h2 className="font-semibold text-slate-700 text-sm mb-3">Entry Log</h2>
          <p className="text-xs text-slate-400 mb-4">Click any value to edit. Changes save immediately.</p>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <EntryLog days={days} hoursMap={hoursMap} onSave={handleSave} />
          )}
        </div>
      </div>
    </div>
  )
}
