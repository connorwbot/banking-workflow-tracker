-- Add hours tracking to standup logs
ALTER TABLE standup_logs
  ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(4,1);

-- Add internship start date to user preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS internship_start_date date NOT NULL DEFAULT '2026-05-04';
