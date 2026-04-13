import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { format, addDays } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = format(new Date(), 'yyyy-MM-dd')
  const in7 = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  const { data } = await supabase
    .from('subtasks')
    .select('*, project:projects(name, color)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .lte('due_date', in7)
    .order('due_date', { ascending: true })
    .limit(20)

  const subtasks = (data ?? []).map((s) => ({
    ...s,
    project_name: (s.project as { name: string } | null)?.name ?? 'Unknown',
    project_color: (s.project as { color: string } | null)?.color ?? '#3B82F6',
  }))

  return NextResponse.json({ subtasks })
}
