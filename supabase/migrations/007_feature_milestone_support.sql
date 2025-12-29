-- Add milestone_id to pm_features for milestone board feature assignment
-- This allows features to be assigned to milestones (sprints) in addition to user stories

-- Add the milestone_id column to pm_features
ALTER TABLE pm_features ADD COLUMN IF NOT EXISTS milestone_id TEXT REFERENCES pm_milestones(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_pm_features_milestone_id ON pm_features(milestone_id);

-- Add function to update feature milestone
CREATE OR REPLACE FUNCTION update_feature_milestone(
    p_feature_id TEXT,
    p_milestone_id TEXT
) RETURNS void AS $$
BEGIN
    UPDATE pm_features
    SET milestone_id = p_milestone_id,
        updated_at = NOW()
    WHERE id = p_feature_id;
END;
$$ LANGUAGE plpgsql;

-- Add function to get features by milestone
CREATE OR REPLACE FUNCTION get_features_by_milestone(
    p_project_id UUID,
    p_milestone_id TEXT
) RETURNS SETOF pm_features AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM pm_features
    WHERE project_id = p_project_id
    AND (milestone_id = p_milestone_id OR (p_milestone_id IS NULL AND milestone_id IS NULL))
    ORDER BY display_order;
END;
$$ LANGUAGE plpgsql;

-- Add function to reset all feature milestone assignments for a project
CREATE OR REPLACE FUNCTION reset_feature_milestone_assignments(p_project_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE pm_features
    SET milestone_id = NULL,
        updated_at = NOW()
    WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;
