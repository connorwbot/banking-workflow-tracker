import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const typeFilter = searchParams.get('type')

  const { data, error } = await supabase
    .from('subtasks')
    .select('*, project:projects!inner(name, color, type, status)')
    .eq('user_id', user.id)
    .eq('completed', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let tasks = (data ?? []).filter((t) => {
    const p = t.project as { type: string; status: string } | null
    if (!p || p.status !== 'active') return false
    if (typeFilter && typeFilter !== 'all') return p.type === typeFilter
    return true
  })

  tasks.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 3
    const pb = PRIORITY_ORDER[b.priority] ?? 3
    if (pa !== pb) return pa - pb
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

  return NextResponse.json({ tasks })
}
