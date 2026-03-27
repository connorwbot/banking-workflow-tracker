'use client'

import { format } from 'date-fns'
import { StatsBar } from '@/components/dashboard/StatsBar'
import { CalendarMiniView } from '@/components/dashboard/CalendarMiniView'
import { DueSoonPanel } from '@/components/dashboard/DueSoonPanel'
import { ProjectsSection } from '@/components/dashboard/ProjectsSection'
import { Header } from '@/components/layout/Header'

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" />

      <div className="flex-1 px-4 py-5 lg:px-6 space-y-5">
        <StatsBar />

        <div className="grid gap-5 lg:grid-cols-2">
          <CalendarMiniView />
          <DueSoonPanel />
        </div>

        <div>
          <h2 className="font-semibold text-slate-800 mb-3">Projects</h2>
          <ProjectsSection />
        </div>
      </div>
    </div>
  )
}
