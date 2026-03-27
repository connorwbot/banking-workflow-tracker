import useSWR, { mutate } from 'swr'
import type { FreeTimeSuggestion } from '@/types/database'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useFreeTime(days = 7) {
  const { data, error, isLoading } = useSWR<{ suggestions: FreeTimeSuggestion[] }>(
    `/api/calendar/free-time?days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  )
  return {
    suggestions: data?.suggestions ?? [],
    loading: isLoading,
    error,
    refresh: () => mutate(`/api/calendar/free-time?days=${days}`),
  }
}

export async function dismissSuggestion(id: string) {
  const res = await fetch('/api/calendar/free-time', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, dismissed: true }),
  })
  await mutate('/api/calendar/free-time?days=7')
  return res.json()
}
