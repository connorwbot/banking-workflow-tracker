DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_cadence') THEN
    CREATE TYPE recurring_cadence AS ENUM ('daily', 'weekdays', 'weekly');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  priority       priority_level NOT NULL DEFAULT 'medium',
  cadence        recurring_cadence NOT NULL DEFAULT 'weekdays',
  weekday        INT CHECK (weekday BETWEEN 0 AND 6),
  due_time       TIME,
  expected_hours NUMERIC(5,2),
  active         BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS recurrence_template_id UUID REFERENCES recurring_task_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_user_id ON recurring_task_templates(user_id, active, cadence);
CREATE INDEX IF NOT EXISTS idx_subtasks_recurrence_template_id ON subtasks(recurrence_template_id);

ALTER TABLE recurring_task_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recurring_task_templates'
      AND policyname = 'Users can manage own recurring templates'
  ) THEN
    CREATE POLICY "Users can manage own recurring templates"
      ON recurring_task_templates
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;
