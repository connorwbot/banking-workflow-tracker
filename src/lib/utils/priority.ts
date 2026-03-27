import type { PriorityLevel } from '@/types/database'

export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: 'text-slate-500',  bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-blue-600',   bg: 'bg-blue-50' },
  high:   { label: 'High',   color: 'text-orange-600', bg: 'bg-orange-50' },
  urgent: { label: 'Urgent', color: 'text-red-600',    bg: 'bg-red-50' },
}

export function priorityConfig(priority: PriorityLevel) {
  return PRIORITY_CONFIG[priority]
}
