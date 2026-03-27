-- Add protected hours columns to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS protected_hours_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS protected_start_day     smallint NOT NULL DEFAULT 5,  -- Friday
  ADD COLUMN IF NOT EXISTS protected_start_time    text     NOT NULL DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS protected_end_day       smallint NOT NULL DEFAULT 6,  -- Saturday
  ADD COLUMN IF NOT EXISTS protected_end_time      text     NOT NULL DEFAULT '10:00';

COMMENT ON COLUMN user_preferences.protected_hours_enabled IS 'When true, no work slots are suggested during the protected window';
COMMENT ON COLUMN user_preferences.protected_start_day     IS '0=Sun … 6=Sat';
COMMENT ON COLUMN user_preferences.protected_end_day       IS '0=Sun … 6=Sat';
