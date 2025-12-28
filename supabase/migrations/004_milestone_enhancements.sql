-- Milestone Board Enhancements
-- PRD v1.1 Implementation
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Add new columns to pm_milestones
-- ============================================

-- Add is_locked column to prevent modifications
ALTER TABLE pm_milestones ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Add created_at and updated_at if they don't exist
ALTER TABLE pm_milestones ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE pm_milestones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================
-- 2. Create Milestone History table (Audit Log)
-- ============================================

CREATE TABLE IF NOT EXISTS pm_milestone_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES pm_milestones(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'story_added', 'story_removed', 'locked', 'unlocked')),
    changed_by UUID, -- FK to auth.users if auth is set up
    changed_at TIMESTAMPTZ DEFAULT now(),
    old_values JSONB,
    new_values JSONB
);

CREATE INDEX IF NOT EXISTS idx_milestone_history_milestone ON pm_milestone_history(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_history_action ON pm_milestone_history(action);
CREATE INDEX IF NOT EXISTS idx_milestone_history_changed_at ON pm_milestone_history(changed_at DESC);

-- Enable RLS
ALTER TABLE pm_milestone_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later based on roles)
CREATE POLICY "Allow all milestone history operations" ON pm_milestone_history
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. Create trigger to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_milestone_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS milestone_updated_at ON pm_milestones;
CREATE TRIGGER milestone_updated_at
    BEFORE UPDATE ON pm_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_timestamp();

-- ============================================
-- 4. Create trigger to log milestone changes
-- ============================================

CREATE OR REPLACE FUNCTION log_milestone_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO pm_milestone_history (milestone_id, action, new_values)
        VALUES (NEW.id, 'created', to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if lock status changed
        IF OLD.is_locked IS DISTINCT FROM NEW.is_locked THEN
            INSERT INTO pm_milestone_history (milestone_id, action, old_values, new_values)
            VALUES (
                NEW.id,
                CASE WHEN NEW.is_locked THEN 'locked' ELSE 'unlocked' END,
                jsonb_build_object('is_locked', OLD.is_locked),
                jsonb_build_object('is_locked', NEW.is_locked)
            );
        ELSE
            INSERT INTO pm_milestone_history (milestone_id, action, old_values, new_values)
            VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW));
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO pm_milestone_history (milestone_id, action, old_values)
        VALUES (OLD.id, 'deleted', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS milestone_audit_log ON pm_milestones;
CREATE TRIGGER milestone_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON pm_milestones
    FOR EACH ROW
    EXECUTE FUNCTION log_milestone_changes();

-- ============================================
-- 5. Create trigger to log story assignments
-- ============================================

CREATE OR REPLACE FUNCTION log_story_milestone_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if milestone_id changed
    IF OLD.milestone_id IS DISTINCT FROM NEW.milestone_id THEN
        -- Log removal from old milestone
        IF OLD.milestone_id IS NOT NULL THEN
            INSERT INTO pm_milestone_history (milestone_id, action, old_values, new_values)
            VALUES (
                OLD.milestone_id,
                'story_removed',
                jsonb_build_object('story_id', OLD.id, 'narrative', OLD.narrative),
                NULL
            );
        END IF;

        -- Log addition to new milestone
        IF NEW.milestone_id IS NOT NULL THEN
            INSERT INTO pm_milestone_history (milestone_id, action, old_values, new_values)
            VALUES (
                NEW.milestone_id,
                'story_added',
                NULL,
                jsonb_build_object('story_id', NEW.id, 'narrative', NEW.narrative)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_story_milestone_audit ON pm_user_stories;
CREATE TRIGGER user_story_milestone_audit
    AFTER UPDATE ON pm_user_stories
    FOR EACH ROW
    EXECUTE FUNCTION log_story_milestone_changes();

-- ============================================
-- 6. Create function for bulk story assignment
-- ============================================

CREATE OR REPLACE FUNCTION bulk_assign_stories_to_milestone(
    story_ids UUID[],
    target_milestone_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE pm_user_stories
    SET milestone_id = target_milestone_id
    WHERE id = ANY(story_ids);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. Create function to duplicate milestone
-- ============================================

CREATE OR REPLACE FUNCTION duplicate_milestone(
    source_milestone_id UUID,
    date_offset_days INTEGER DEFAULT 14
)
RETURNS UUID AS $$
DECLARE
    new_milestone_id UUID;
    source_milestone pm_milestones%ROWTYPE;
BEGIN
    -- Get source milestone
    SELECT * INTO source_milestone FROM pm_milestones WHERE id = source_milestone_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Milestone not found';
    END IF;

    -- Create new milestone with shifted dates
    INSERT INTO pm_milestones (
        project_id,
        name,
        description,
        start_date,
        target_date,
        status,
        phase,
        color,
        sort_order,
        is_locked
    ) VALUES (
        source_milestone.project_id,
        source_milestone.name || ' (Copy)',
        source_milestone.description,
        (source_milestone.start_date::date + date_offset_days)::text,
        (source_milestone.target_date::date + date_offset_days)::text,
        'upcoming',
        source_milestone.phase,
        source_milestone.color,
        source_milestone.sort_order + 1,
        false
    ) RETURNING id INTO new_milestone_id;

    RETURN new_milestone_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Add indexes for better query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_milestones_project_status ON pm_milestones(project_id, status);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON pm_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_user_stories_milestone ON pm_user_stories(milestone_id);
