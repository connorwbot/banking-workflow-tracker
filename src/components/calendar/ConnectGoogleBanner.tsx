import { CalendarDays } from 'lucide-react'

export function ConnectGoogleBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
      <CalendarDays size={20} className="text-blue-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">Connect Google Calendar</p>
        <p className="text-xs text-blue-600 mt-0.5">See your schedule and get smart scheduling suggestions</p>
      </div>
      <a
        href="/api/auth/google"
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
      >
        Connect
      </a>
    </div>
  )
}
