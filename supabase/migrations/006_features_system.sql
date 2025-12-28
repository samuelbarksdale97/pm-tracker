-- Features System Migration
-- Implements Feature layer: Epic → Feature → User Story → Task
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Create pm_features table
-- ============================================

CREATE TABLE IF NOT EXISTS pm_features (
    id TEXT PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    epic_id TEXT NOT NULL REFERENCES pm_epics(id) ON DELETE CASCADE,

    -- Core Feature Information
    name TEXT NOT NULL,
    description TEXT,

    -- Status and priority
    status TEXT NOT NULL DEFAULT 'Not Started'
        CHECK (status IN ('Not Started', 'In Progress', 'Done', 'On Hold')),
    priority TEXT NOT NULL DEFAULT 'P1'
        CHECK (priority IN ('P0', 'P1', 'P2')),

    -- Ordering within Epic
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pm_features_project_id ON pm_features(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_features_epic_id ON pm_features(epic_id);
CREATE INDEX IF NOT EXISTS idx_pm_features_epic_order ON pm_features(epic_id, display_order);

-- ============================================
-- 2. Add feature_id to pm_user_stories
-- ============================================

ALTER TABLE pm_user_stories
    ADD COLUMN IF NOT EXISTS feature_id TEXT REFERENCES pm_features(id) ON DELETE SET NULL;

-- Index for Feature → UserStory lookups
CREATE INDEX IF NOT EXISTS idx_pm_user_stories_feature_id ON pm_user_stories(feature_id);

-- ============================================
-- 3. Enable RLS on pm_features
-- ============================================

ALTER TABLE pm_features ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (matches other pm_ tables)
CREATE POLICY "Allow all for pm_features" ON pm_features
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. Comments for documentation
-- ============================================

COMMENT ON TABLE pm_features IS 'Features are logical groupings of user stories within an Epic';
COMMENT ON COLUMN pm_features.epic_id IS 'Parent Epic that contains this Feature';
COMMENT ON COLUMN pm_features.display_order IS 'Order of Feature within its Epic for UI display';
COMMENT ON COLUMN pm_user_stories.feature_id IS 'Optional parent Feature. Stories can exist without a Feature but within an Epic';
