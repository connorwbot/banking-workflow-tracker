'use client'

import { useState } from 'react'
import { useTodayStandup, useStandupHistory } from '@/hooks/useStandup'
import { StandupForm } from '@/components/standup/StandupForm'
import { StandupEntry } from '@/components/standup/StandupEntry'
import { Header } from '@/components/layout/Header'
import { Skeleton } from '@/components/ui/Skeleton'
import { format } from 'date-fns'

export default function StandupPage() {
  const { log, loading, refresh } = useTodayStandup()
  const { logs: history } = useStandupHistory()
  const [editing, setEditing] = useState(false)

  const pastLogs = history.filter((l) => l.log_date !== format(new Date(), 'yyyy-MM-dd'))

  return (
    <div className="flex flex-col flex-1">
      <Header title="Daily Log" />
      <div className="flex-1 px-4 py-5 lg:px-6 max-w-2xl space-y-6">

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Today — {format(new Date(), 'MMMM d')}</h2>
            {log && !editing && (
              <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">
                Edit
              </button>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : log && !editing ? (
            <StandupEntry log={log} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <StandupForm existing={log} onSaved={() => { refresh(); setEditing(false) }} />
            </div>
          )}
        </div>

        {pastLogs.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 text-sm">Past logs</h3>
            <div className="space-y-3">
              {pastLogs.slice(0, 10).map((l) => (
                <StandupEntry key={l.id} log={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
