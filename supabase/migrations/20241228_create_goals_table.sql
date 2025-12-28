-- Migration: Create pm_goals table for Goals/Releases visualization
-- This replaces the milestone-centric approach with a Feature-level Goals system

-- Create the pm_goals table
CREATE TABLE IF NOT EXISTS pm_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Time horizon for Now/Next/Later roadmap
    time_horizon VARCHAR(20) NOT NULL DEFAULT 'next' CHECK (time_horizon IN ('now', 'next', 'later')),

    -- Optional specific target date or quarter
    target_quarter VARCHAR(20), -- e.g., "Q1 2025", "Q2 2025"
    target_date DATE,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'at_risk')),

    -- Visual customization
    theme_color VARCHAR(20) DEFAULT 'blue', -- blue, green, purple, orange, red, gray
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add goal_id to pm_features table to link features to goals
ALTER TABLE pm_features
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES pm_goals(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pm_goals_project_id ON pm_goals(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_goals_time_horizon ON pm_goals(time_horizon);
CREATE INDEX IF NOT EXISTS idx_pm_features_goal_id ON pm_features(goal_id);

-- Add updated_at trigger for pm_goals
CREATE OR REPLACE FUNCTION update_pm_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pm_goals_updated_at
    BEFORE UPDATE ON pm_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_pm_goals_updated_at();

-- Add RLS policies (assuming RLS is enabled)
ALTER TABLE pm_goals ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed for your auth setup)
CREATE POLICY "Allow all for authenticated users" ON pm_goals
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE pm_goals IS 'Goals/Releases for visual roadmap tracking at the Feature level';
COMMENT ON COLUMN pm_goals.time_horizon IS 'Now/Next/Later categorization for roadmap view';
COMMENT ON COLUMN pm_goals.target_quarter IS 'Optional quarter target like Q1 2025';
COMMENT ON COLUMN pm_goals.theme_color IS 'Color theme for visual distinction in timeline';
COMMENT ON COLUMN pm_features.goal_id IS 'Links feature to a goal for progress aggregation';
