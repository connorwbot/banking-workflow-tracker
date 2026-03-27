import useSWR, { mutate } from 'swr'
import type { Project, Subtask } from '@/types/database'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProjects() {
  const { data, error, isLoading } = useSWR<{ projects: Project[] }>('/api/projects', fetcher)
  return {
    projects: data?.projects ?? [],
    loading: isLoading,
    error,
    refresh: () => mutate('/api/projects'),
  }
}

export function useProject(id: string) {
  const { data, error, isLoading } = useSWR<{ project: Project; subtasks: Subtask[] }>(
    id ? `/api/projects/${id}` : null,
    fetcher
  )
  return {
    project: data?.project,
    subtasks: data?.subtasks ?? [],
    loading: isLoading,
    error,
    refresh: () => mutate(`/api/projects/${id}`),
  }
}

export async function createProject(payload: Partial<Project>) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await mutate('/api/projects')
  return res.json()
}

export async function updateProject(id: string, payload: Partial<Project>) {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await mutate('/api/projects')
  await mutate(`/api/projects/${id}`)
  return res.json()
}

export async function deleteProject(id: string) {
  await fetch(`/api/projects/${id}`, { method: 'DELETE' })
  await mutate('/api/projects')
}

export async function createSubtask(projectId: string, payload: Partial<Subtask>) {
  const res = await fetch(`/api/projects/${projectId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await mutate(`/api/projects/${projectId}`)
  return res.json()
}

export async function updateSubtask(projectId: string, subtaskId: string, payload: Partial<Subtask>) {
  const res = await fetch(`/api/projects/${projectId}/subtasks`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: subtaskId, ...payload }),
  })
  await mutate(`/api/projects/${projectId}`)
  return res.json()
}

export async function deleteSubtask(projectId: string, subtaskId: string) {
  await fetch(`/api/projects/${projectId}/subtasks?subtaskId=${subtaskId}`, { method: 'DELETE' })
  await mutate(`/api/projects/${projectId}`)
}
