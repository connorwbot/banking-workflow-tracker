import type { SupabaseClient } from '@supabase/supabase-js'

const INBOX_NAME = 'Inbox'
const INBOX_COLOR = '#64748b'

type ProjectRecord = {
  id: string
  name: string
  type: string
  status: string
  color: string
  sort_order: number
}

export async function ensureInboxProject(
  supabase: SupabaseClient,
  userId: string
): Promise<ProjectRecord> {
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('id,name,type,status,color,sort_order')
    .eq('user_id', userId)
    .eq('name', INBOX_NAME)
    .eq('type', 'misc')
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (existing) return existing as ProjectRecord

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: INBOX_NAME,
      type: 'misc',
      status: 'active',
      color: INBOX_COLOR,
      sort_order: -9999,
    })
    .select('id,name,type,status,color,sort_order')
    .single()

  if (error || !data) {
    throw error ?? new Error('Failed to create Inbox project')
  }

  return data as ProjectRecord
}

export function isInboxProject(project?: { name?: string | null; type?: string | null } | null) {
  return project?.name === INBOX_NAME && project?.type === 'misc'
}

export const INBOX_PROJECT_NAME = INBOX_NAME
