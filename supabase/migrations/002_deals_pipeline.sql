-- =============================================
-- 002_deals_pipeline.sql
-- Pipeline tables: stages, deals, stage history
-- =============================================

CREATE TABLE pipeline_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  color       TEXT NOT NULL,
  sort_order  INT NOT NULL,
  is_terminal BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  stage_id        UUID NOT NULL REFERENCES pipeline_stages(id),
  stage_notes     TEXT,
  probability     INT CHECK (probability >= 0 AND probability <= 100),
  expected_close  DATE,
  counterparty    TEXT,
  banker_lead     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_stage_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES pipeline_deals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_stage_id   UUID REFERENCES pipeline_stages(id),
  to_stage_id     UUID NOT NULL REFERENCES pipeline_stages(id),
  notes           TEXT,
  transitioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pipeline_deals_stage   ON pipeline_deals(stage_id);
CREATE INDEX idx_pipeline_deals_user    ON pipeline_deals(user_id);
CREATE INDEX idx_stage_history_deal     ON pipeline_stage_history(deal_id);

-- Seed global default stages (user_id = NULL means global defaults)
INSERT INTO pipeline_stages (user_id, name, slug, color, sort_order, is_terminal) VALUES
  (NULL, 'Pitching',       'pitching',       '#3B82F6', 1, FALSE),
  (NULL, 'First Round',    'first_round',    '#EAB308', 2, FALSE),
  (NULL, 'Under LOI',      'under_loi',      '#F97316', 3, FALSE),
  (NULL, 'Due Diligence',  'due_diligence',  '#8B5CF6', 4, FALSE),
  (NULL, 'Closed - Won',   'closed_won',     '#22C55E', 5, TRUE),
  (NULL, 'Closed - Lost',  'closed_lost',    '#EF4444', 6, TRUE),
  (NULL, 'On Hold',        'on_hold',        '#6B7280', 7, FALSE);
