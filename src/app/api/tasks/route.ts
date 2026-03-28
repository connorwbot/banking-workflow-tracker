import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')

  const [tasksRes, membersRes] = await Promise.all([
    supabase
      .from('subtasks')
      .select('*, project:projects!inner(name, color, type, status)')
      .eq('user_id', user.id)
      .eq('completed', false),
    supabase
      .from('team_members')
      .select('id, name')
      .eq('user_id', user.id),
  ])

  if (tasksRes.error) return NextResponse.json({ error: tasksRes.error.message }, { status: 500 })

  const memberMap = Object.fromEntries((membersRes.data ?? []).map((m) => [m.id, m.name]))

  const tasks = (tasksRes.data ?? []).filter((t) => {
    const p = t.project as { type: string; status: string } | null
    if (!p || p.status !== 'active') return false
    if (typeFilter && typeFilter !== 'all') return p.type === typeFilter
    return true
  }).map((t) => ({
    ...t,
    delegated_by_names: ((t.delegated_by as string[]) ?? []).map((id) => memberMap[id]).filter(Boolean),
    owner_member_name: t.owner_member_id ? memberMap[t.owner_member_id] ?? null : null,
  }))

  tasks.sort((a, b) => {
    const statusOrder = { open: 0, blocked: 1, waiting: 2, done: 3 } as const
    const sa = statusOrder[(a.status as keyof typeof statusOrder) ?? 'open'] ?? 0
    const sb = statusOrder[(b.status as keyof typeof statusOrder) ?? 'open'] ?? 0
    if (sa !== sb) return sa - sb
    const pa = PRIORITY_ORDER[a.priority] ?? 3
    const pb = PRIORITY_ORDER[b.priority] ?? 3
    if (pa !== pb) return pa - pb
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    const dateCompare = a.due_date.localeCompare(b.due_date)
    if (dateCompare !== 0) return dateCompare
    const aTime = a.due_time ?? '23:59'
    const bTime = b.due_time ?? '23:59'
    return aTime.localeCompare(bTime)
  })

  return NextResponse.json({ tasks })
}
