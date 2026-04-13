import { formatDate } from '@/lib/utils/date'
import type { StandupLog } from '@/types/database'

const MOODS = ['😴', '😕', '😐', '😊', '🔥']

export function StandupEntry({ log }: { log: StandupLog }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-800 text-sm">{formatDate(log.log_date, 'EEEE, MMMM d')}</h3>
          {log.hours_worked != null && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{log.hours_worked} hrs</span>
          )}
        </div>
        {log.mood_score && (
          <span className="text-lg">{MOODS[log.mood_score - 1]}</span>
        )}
      </div>

      {log.worked_on && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Worked on</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.worked_on}</p>
        </div>
      )}
      {log.wins && (
        <div>
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Wins</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.wins}</p>
        </div>
      )}
      {log.blockers && (
        <div>
          <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Blockers</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.blockers}</p>
        </div>
      )}
      {log.tomorrow_plan && (
        <div>
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Tomorrow</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.tomorrow_plan}</p>
        </div>
      )}
    </div>
  )
}
