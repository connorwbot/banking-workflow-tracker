-- =============================================
-- 001_initial_schema.sql
-- Core tables: profiles, user_preferences, projects, subtasks, standup_logs, free_time_suggestions
-- =============================================

-- Enums
CREATE TYPE project_type AS ENUM ('pitch', 'live_deal', 'misc');
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'closed', 'won', 'lost');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- profiles: extends auth.users, stores Google tokens
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  avatar_url            TEXT,
  google_access_token   TEXT,
  google_refresh_token  TEXT,
  google_token_expiry   TIMESTAMPTZ,
  google_calendar_id    TEXT DEFAULT 'primary',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- user_preferences: scheduler config (one row per user)
CREATE TABLE user_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  gym_preferred_start     TIME DEFAULT '06:00',
  gym_preferred_end       TIME DEFAULT '09:00',
  gym_duration_mins       INT DEFAULT 60,
  gym_days                INT[] DEFAULT '{1,3,5}',
  lunch_start             TIME DEFAULT '12:00',
  lunch_end               TIME DEFAULT '13:30',
  dinner_start            TIME DEFAULT '18:30',
  dinner_end              TIME DEFAULT '21:00',
  focus_min_duration_mins INT DEFAULT 90,
  work_day_start          TIME DEFAULT '08:00',
  work_day_end            TIME DEFAULT '22:00',
  timezone                TEXT DEFAULT 'America/New_York',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- projects
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          project_type NOT NULL DEFAULT 'misc',
  status        project_status NOT NULL DEFAULT 'active',
  description   TEXT,
  company_name  TEXT,
  deal_size     NUMERIC(18,2),
  due_date      DATE,
  color         TEXT DEFAULT '#3B82F6',
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- subtasks
CREATE TABLE subtasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  priority      priority_level NOT NULL DEFAULT 'medium',
  due_date      DATE,
  due_time      TIME,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  gcal_event_id TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- standup_logs: one per day per user
CREATE TABLE standup_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL,
  worked_on     TEXT,
  blockers      TEXT,
  wins          TEXT,
  tomorrow_plan TEXT,
  mood_score    INT CHECK (mood_score >= 1 AND mood_score <= 5),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- free_time_suggestions: cached scheduler output
CREATE TABLE free_time_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_date DATE NOT NULL,
  slot_type       TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  duration_mins   INT NOT NULL,
  confidence      TEXT DEFAULT 'high',
  gcal_conflict   BOOLEAN DEFAULT FALSE,
  dismissed       BOOLEAN DEFAULT FALSE,
  gcal_event_id   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, suggestion_date, slot_type, start_time)
);

-- Indexes
CREATE INDEX idx_projects_user_id     ON projects(user_id);
CREATE INDEX idx_projects_type        ON projects(user_id, type);
CREATE INDEX idx_projects_status      ON projects(user_id, status);
CREATE INDEX idx_subtasks_project_id  ON subtasks(project_id);
CREATE INDEX idx_subtasks_due_date    ON subtasks(user_id, due_date) WHERE completed = FALSE;
CREATE INDEX idx_standup_logs_date    ON standup_logs(user_id, log_date DESC);
CREATE INDEX idx_free_time_date       ON free_time_suggestions(user_id, suggestion_date);
