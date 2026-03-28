-- Allow subtasks to be tied to a specific banker/analyst on the team
ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS owner_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN subtasks.owner_member_id IS 'Primary banker/analyst the task belongs to';
