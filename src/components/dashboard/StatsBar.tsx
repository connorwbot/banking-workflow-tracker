import useSWR from 'swr'
import { Skeleton } from '@/components/ui/Skeleton'
import { ListTodo, GitMerge, TrendingUp, Clock } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Stats {
  tasksToday: number
  activeDeals: number
  activePitches: number
  freeHoursToday: number
}

export function StatsBar() {
  const { data, isLoading } = useSWR<Stats>('/api/stats', fetcher)

  const stats = [
    { icon: ListTodo, label: 'Due today', value: data?.tasksToday ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: TrendingUp, label: 'Pitches', value: data?.activePitches ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: GitMerge, label: 'Live deals', value: data?.activeDeals ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Clock, label: 'Free hrs', value: data?.freeHoursToday ?? 0, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={color} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
