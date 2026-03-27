import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const Schema = z.object({
  stageId: z.string().uuid(),
  notes: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Get current deal
  const { data: deal } = await supabase
    .from('pipeline_deals')
    .select('stage_id')
    .eq('id', dealId)
    .eq('user_id', user.id)
    .single()

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  // Write history entry
  await supabase.from('pipeline_stage_history').insert({
    deal_id: dealId,
    user_id: user.id,
    from_stage_id: deal.stage_id,
    to_stage_id: parsed.data.stageId,
    notes: parsed.data.notes,
  })

  // Update deal
  const { data: updated, error } = await supabase
    .from('pipeline_deals')
    .update({
      stage_id: parsed.data.stageId,
      stage_notes: parsed.data.notes,
      probability: parsed.data.probability,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)
    .eq('user_id', user.id)
    .select('*, project:projects(*), stage:pipeline_stages(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If terminal stage, update project status
  if (updated.stage) {
    const stage = updated.stage as { is_terminal: boolean; slug: string }
    if (stage.is_terminal) {
      const newStatus = stage.slug === 'closed_won' ? 'won' : 'lost'
      await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', updated.project_id)
        .eq('user_id', user.id)
    }
  }

  return NextResponse.json({ deal: updated })
}
