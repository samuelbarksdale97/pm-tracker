-- Park at 14th Timeline Data
-- Create tables to persist timeline milestones and questions to database
-- This replaces localStorage persistence

-- ============================================
-- 1. Create park_milestones table
-- ============================================

CREATE TABLE IF NOT EXISTS park_milestones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'complete', 'blocked')),
    owner TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_park_milestones_date ON park_milestones(date);
CREATE INDEX IF NOT EXISTS idx_park_milestones_status ON park_milestones(status);

-- Enable RLS
ALTER TABLE park_milestones ENABLE ROW LEVEL SECURITY;

-- Allow all operations (can be restricted later based on auth)
CREATE POLICY "Allow all park milestone operations" ON park_milestones
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. Create park_questions table
-- ============================================

CREATE TABLE IF NOT EXISTS park_questions (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    context TEXT,
    status TEXT NOT NULL CHECK (status IN ('open', 'answered', 'deferred')),
    answer TEXT,
    answered_date TEXT, -- YYYY-MM-DD format
    category TEXT NOT NULL CHECK (category IN ('product', 'technical', 'business', 'other')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_park_questions_status ON park_questions(status);
CREATE INDEX IF NOT EXISTS idx_park_questions_category ON park_questions(category);

-- Enable RLS
ALTER TABLE park_questions ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all park question operations" ON park_questions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. Create triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_park_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS park_milestones_updated_at ON park_milestones;
CREATE TRIGGER park_milestones_updated_at
    BEFORE UPDATE ON park_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_park_timestamp();

DROP TRIGGER IF EXISTS park_questions_updated_at ON park_questions;
CREATE TRIGGER park_questions_updated_at
    BEFORE UPDATE ON park_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_park_timestamp();
