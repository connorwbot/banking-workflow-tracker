ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS expected_hours numeric(5,2);

COMMENT ON COLUMN subtasks.expected_hours IS 'Optional estimate of effort in hours for the task';
