DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subtask_status') THEN
    CREATE TYPE subtask_status AS ENUM ('open', 'waiting', 'blocked', 'done');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_feedback') THEN
    CREATE TYPE recommendation_feedback AS ENUM ('do_now', 'too_big', 'not_urgent', 'waiting_on_someone');
  END IF;
END $$;

ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS status subtask_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS recommendation_feedback recommendation_feedback;

UPDATE subtasks
SET status = CASE
  WHEN completed = true THEN 'done'::subtask_status
  ELSE 'open'::subtask_status
END
WHERE status IS NULL OR status = 'open';

COMMENT ON COLUMN subtasks.status IS 'Execution state for the task workflow';
COMMENT ON COLUMN subtasks.recommendation_feedback IS 'User feedback from Today recommendation controls';
