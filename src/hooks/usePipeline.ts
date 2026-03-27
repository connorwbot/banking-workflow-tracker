import useSWR, { mutate } from 'swr'
import type { PipelineStage, DealWithProject } from '@/types/database'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function usePipeline() {
  const { data, error, isLoading } = useSWR<{ stages: PipelineStage[]; deals: DealWithProject[] }>(
    '/api/pipeline',
    fetcher,
    { revalidateOnFocus: true }
  )
  return {
    stages: data?.stages ?? [],
    deals: data?.deals ?? [],
    loading: isLoading,
    error,
    refresh: () => mutate('/api/pipeline'),
  }
}

export async function moveDealStage(dealId: string, stageId: string, notes?: string) {
  const res = await fetch(`/api/pipeline/${dealId}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageId, notes }),
  })
  await mutate('/api/pipeline')
  return res.json()
}
