export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProjectType = 'pitch' | 'live_deal' | 'misc'
export type ProjectStatus = 'active' | 'on_hold' | 'closed' | 'won' | 'lost'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  google_access_token: string | null
  google_refresh_token: string | null
  google_token_expiry: string | null
  google_calendar_id: string | null
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  gym_preferred_start: string
  gym_preferred_end: string
  gym_duration_mins: number
  gym_days: number[]
  lunch_start: string
  lunch_end: string
  dinner_start: string
  dinner_end: string
  focus_min_duration_mins: number
  work_day_start: string
  work_day_end: string
  timezone: string
  // Protected hours — window off-limits for work staffing
  protected_hours_enabled: boolean
  protected_start_day: number   // 0=Sun … 6=Sat
  protected_start_time: string  // 'HH:MM'
  protected_end_day: number
  protected_end_time: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  type: ProjectType
  status: ProjectStatus
  description: string | null
  company_name: string | null
  deal_size: number | null
  due_date: string | null
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Subtask {
  id: string
  project_id: string
  user_id: string
  title: string
  description: string | null
  priority: PriorityLevel
  due_date: string | null
  due_time: string | null
  completed: boolean
  completed_at: string | null
  gcal_event_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StandupLog {
  id: string
  user_id: string
  log_date: string
  worked_on: string | null
  blockers: string | null
  wins: string | null
  tomorrow_plan: string | null
  mood_score: number | null
  created_at: string
  updated_at: string
}

export interface FreeTimeSuggestion {
  id: string
  user_id: string
  suggestion_date: string
  slot_type: 'gym' | 'lunch' | 'dinner' | 'focus_block'
  start_time: string
  end_time: string
  duration_mins: number
  confidence: 'high' | 'medium' | 'low'
  gcal_conflict: boolean
  dismissed: boolean
  gcal_event_id: string | null
  created_at: string
}

export interface PipelineStage {
  id: string
  user_id: string | null
  name: string
  slug: string
  color: string
  sort_order: number
  is_terminal: boolean
  created_at: string
}

export interface PipelineDeal {
  id: string
  user_id: string
  project_id: string
  stage_id: string
  stage_notes: string | null
  probability: number | null
  expected_close: string | null
  counterparty: string | null
  banker_lead: string | null
  created_at: string
  updated_at: string
}

export interface PipelineStageHistory {
  id: string
  deal_id: string
  user_id: string
  from_stage_id: string | null
  to_stage_id: string
  notes: string | null
  transitioned_at: string
}

// Joined types for common queries
export interface ProjectWithSubtasks extends Project {
  subtasks: Subtask[]
}

export interface DealWithProject extends PipelineDeal {
  project: Project
  stage: PipelineStage
}

// Supabase Database shape (used with createClient generic)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      user_preferences: { Row: UserPreferences; Insert: Partial<UserPreferences>; Update: Partial<UserPreferences> }
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> }
      subtasks: { Row: Subtask; Insert: Partial<Subtask>; Update: Partial<Subtask> }
      standup_logs: { Row: StandupLog; Insert: Partial<StandupLog>; Update: Partial<StandupLog> }
      free_time_suggestions: { Row: FreeTimeSuggestion; Insert: Partial<FreeTimeSuggestion>; Update: Partial<FreeTimeSuggestion> }
      pipeline_stages: { Row: PipelineStage; Insert: Partial<PipelineStage>; Update: Partial<PipelineStage> }
      pipeline_deals: { Row: PipelineDeal; Insert: Partial<PipelineDeal>; Update: Partial<PipelineDeal> }
      pipeline_stage_history: { Row: PipelineStageHistory; Insert: Partial<PipelineStageHistory>; Update: Partial<PipelineStageHistory> }
    }
  }
}
