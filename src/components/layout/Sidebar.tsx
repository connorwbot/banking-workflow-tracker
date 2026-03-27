'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  FolderKanban,
  GitMerge,
  BookOpen,
  Clock,
  CalendarDays,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/projects',   label: 'Projects',     icon: FolderKanban },
  { href: '/pipeline',   label: 'Pipeline',     icon: GitMerge },
  { href: '/standup',    label: 'Daily Log',    icon: BookOpen },
  { href: '/free-time',  label: 'Free Time',    icon: Clock },
  { href: '/weekly',     label: 'Weekly',       icon: CalendarDays },
  { href: '/settings',   label: 'Settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-slate-950 border-r border-slate-800 py-6 px-3">
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <LayoutDashboard size={16} className="text-white" />
        </div>
        <span className="text-white font-semibold text-sm">IB Tracker</span>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href) && href !== '/'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mt-4"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </aside>
  )
}
