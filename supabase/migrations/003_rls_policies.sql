-- =============================================
-- 003_rls_policies.sql
-- Row Level Security policies for all tables
-- =============================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- subtasks
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subtasks" ON subtasks FOR ALL USING (auth.uid() = user_id);

-- standup_logs
ALTER TABLE standup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own standup logs" ON standup_logs FOR ALL USING (auth.uid() = user_id);

-- free_time_suggestions
ALTER TABLE free_time_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own free time suggestions" ON free_time_suggestions FOR ALL USING (auth.uid() = user_id);

-- pipeline_stages: global stages (user_id = NULL) are readable by all authenticated users
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read global stages" ON pipeline_stages FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own stages" ON pipeline_stages FOR ALL USING (auth.uid() = user_id);

-- pipeline_deals
ALTER TABLE pipeline_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own deals" ON pipeline_deals FOR ALL USING (auth.uid() = user_id);

-- pipeline_stage_history
ALTER TABLE pipeline_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stage history" ON pipeline_stage_history FOR ALL USING (auth.uid() = user_id);
