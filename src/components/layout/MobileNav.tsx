'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { LayoutDashboard, GitMerge, BookOpen, Clock, CalendarDays } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/pipeline',  label: 'Pipeline', icon: GitMerge },
  { href: '/standup',   label: 'Log',      icon: BookOpen },
  { href: '/free-time', label: 'Free Time',icon: Clock },
  { href: '/weekly',    label: 'Weekly',   icon: CalendarDays },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-area-bottom">
      <div className="flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[60px] transition-colors',
                active ? 'text-blue-600' : 'text-slate-400'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
