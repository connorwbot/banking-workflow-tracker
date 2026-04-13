import useSWR, { mutate } from 'swr'
import type { StandupLog } from '@/types/database'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useTodayStandup() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data, error, isLoading } = useSWR<{ log: StandupLog | null }>(
    `/api/standup?date=${today}`,
    fetcher
  )
  return {
    log: data?.log ?? null,
    loading: isLoading,
    error,
    refresh: () => mutate(`/api/standup?date=${today}`),
  }
}

export function useStandupHistory(limit = 30) {
  const { data, error, isLoading } = useSWR<{ logs: StandupLog[] }>(
    `/api/standup?limit=${limit}`,
    fetcher
  )
  return { logs: data?.logs ?? [], loading: isLoading, error }
}

export async function saveStandup(payload: Partial<StandupLog>) {
  const res = await fetch('/api/standup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const today = format(new Date(), 'yyyy-MM-dd')
  await mutate(`/api/standup?date=${today}`)
  await mutate('/api/standup?limit=30')
  return res.json()
}
