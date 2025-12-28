-- Epic & Project Context System Migration
-- Implements Hierarchical Context: Epic → Feature → User Story → Task
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Add context_document to pm_projects
-- ============================================

-- Add project-level context document (PRD-style markdown content)
ALTER TABLE pm_projects ADD COLUMN IF NOT EXISTS context_document TEXT;

-- Add project brief fields for structured context
ALTER TABLE pm_projects ADD COLUMN IF NOT EXISTS project_brief JSONB DEFAULT '{}'::jsonb;

-- The project_brief JSONB structure:
-- {
--   "vision": "One-sentence description of what the project achieves",
--   "target_users": ["Member", "Admin", "Staff"],
--   "key_features": ["Feature 1", "Feature 2"],
--   "tech_stack": { "frontend": "React Native", "backend": "Supabase", "admin": "Next.js" },
--   "business_goals": ["Goal 1", "Goal 2"],
--   "constraints": ["Constraint 1", "Constraint 2"]
-- }

-- ============================================
-- 2. Create pm_epics table
-- ============================================

CREATE TABLE IF NOT EXISTS pm_epics (
    id TEXT PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,

    -- Core Epic Information
    name TEXT NOT NULL,
    description TEXT,

    -- Feature area alignment (maps to user story feature_areas)
    -- Can cover multiple feature areas
    feature_areas TEXT[] DEFAULT '{}',

    -- Business context (helps AI understand the purpose)
    business_objectives TEXT[],
    success_metrics TEXT[],
    user_value TEXT, -- What value does this deliver to users?

    -- Technical context (helps AI generate appropriate implementation)
    technical_context TEXT, -- Architecture notes, constraints, patterns to follow
    dependencies TEXT[], -- Other epics or external dependencies

    -- Priority and status
    priority TEXT DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2')),
    status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Done', 'On Hold')),

    -- Display ordering
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pm_epics_project_id ON pm_epics(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_epics_status ON pm_epics(status);
CREATE INDEX IF NOT EXISTS idx_pm_epics_priority ON pm_epics(priority);

-- Enable RLS
ALTER TABLE pm_epics ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching other pm_* tables)
CREATE POLICY "Allow all operations on pm_epics" ON pm_epics
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. Add epic_id to pm_user_stories
-- ============================================

ALTER TABLE pm_user_stories ADD COLUMN IF NOT EXISTS epic_id TEXT REFERENCES pm_epics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_stories_epic ON pm_user_stories(epic_id);

-- ============================================
-- 4. Create trigger to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_epic_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS epic_updated_at ON pm_epics;
CREATE TRIGGER epic_updated_at
    BEFORE UPDATE ON pm_epics
    FOR EACH ROW
    EXECUTE FUNCTION update_epic_timestamp();

-- ============================================
-- 5. Create helper functions
-- ============================================

-- Get full context for a user story (including epic and project context)
CREATE OR REPLACE FUNCTION get_user_story_full_context(story_id TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_story', jsonb_build_object(
            'id', us.id,
            'narrative', us.narrative,
            'persona', us.persona,
            'feature_area', us.feature_area,
            'acceptance_criteria', us.acceptance_criteria,
            'priority', us.priority
        ),
        'epic', CASE WHEN e.id IS NOT NULL THEN jsonb_build_object(
            'id', e.id,
            'name', e.name,
            'description', e.description,
            'business_objectives', e.business_objectives,
            'technical_context', e.technical_context,
            'user_value', e.user_value
        ) ELSE NULL END,
        'project', jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'context_document', p.context_document,
            'project_brief', p.project_brief
        )
    ) INTO result
    FROM pm_user_stories us
    LEFT JOIN pm_epics e ON us.epic_id = e.id
    LEFT JOIN pm_projects p ON us.project_id = p.id
    WHERE us.id = story_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get all epics with their user story counts
CREATE OR REPLACE FUNCTION get_epics_with_counts(project_id_param UUID)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    description TEXT,
    feature_areas TEXT[],
    business_objectives TEXT[],
    priority TEXT,
    status TEXT,
    display_order INTEGER,
    user_story_count BIGINT,
    completed_story_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.name,
        e.description,
        e.feature_areas,
        e.business_objectives,
        e.priority,
        e.status,
        e.display_order,
        COUNT(us.id) as user_story_count,
        COUNT(us.id) FILTER (WHERE us.status = 'Done') as completed_story_count
    FROM pm_epics e
    LEFT JOIN pm_user_stories us ON us.epic_id = e.id
    WHERE e.project_id = project_id_param
    GROUP BY e.id
    ORDER BY e.display_order, e.created_at;
END;
$$ LANGUAGE plpgsql;

-- Bulk assign user stories to an epic
CREATE OR REPLACE FUNCTION bulk_assign_stories_to_epic(
    story_ids TEXT[],
    target_epic_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE pm_user_stories
    SET epic_id = target_epic_id
    WHERE id = ANY(story_ids);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Create pm_project_context_files table
-- ============================================
-- For storing references to uploaded context files (PDFs, docs, etc.)

CREATE TABLE IF NOT EXISTS pm_project_context_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Storage path
    file_type TEXT, -- 'pdf', 'md', 'doc', etc.
    extracted_text TEXT, -- Extracted text content for AI context
    summary TEXT, -- AI-generated summary of the document
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_context_files_project ON pm_project_context_files(project_id);

ALTER TABLE pm_project_context_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on pm_project_context_files" ON pm_project_context_files
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. Add comments for documentation
-- ============================================

COMMENT ON TABLE pm_epics IS 'Epics represent high-level features or initiatives that group related user stories';
COMMENT ON COLUMN pm_epics.business_objectives IS 'Array of business goals this epic achieves';
COMMENT ON COLUMN pm_epics.technical_context IS 'Architecture notes and technical constraints for AI context';
COMMENT ON COLUMN pm_epics.user_value IS 'The value this epic delivers to end users';

COMMENT ON COLUMN pm_projects.context_document IS 'Markdown content describing the project (PRD-style)';
COMMENT ON COLUMN pm_projects.project_brief IS 'Structured JSON with vision, target users, tech stack, etc.';

COMMENT ON COLUMN pm_user_stories.epic_id IS 'Optional link to parent epic for hierarchical organization';
