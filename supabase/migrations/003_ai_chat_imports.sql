-- AI Chat Assistant + Import Wizard Schema
-- Run this in Supabase SQL Editor

-- Chat History Table
-- Stores conversation history for the AI assistant
CREATE TABLE IF NOT EXISTS pm_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    session_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB, -- For structured data like suggested actions
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_history_project ON pm_chat_history(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON pm_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created ON pm_chat_history(created_at DESC);

-- Enable RLS
ALTER TABLE pm_chat_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be restricted later)
CREATE POLICY "Allow all chat operations" ON pm_chat_history
    FOR ALL USING (true) WITH CHECK (true);

-- Imports Table
-- Stores uploaded documents and transcripts with their extracted items
CREATE TABLE IF NOT EXISTS pm_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'markdown', 'transcript', 'audio', 'pdf'
    source TEXT, -- 'fireflies', 'upload', 'paste'
    raw_content TEXT, -- Original content
    processed_content TEXT, -- After transcription/parsing
    extracted_items JSONB, -- Structured items before import
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'reviewed', 'imported', 'rejected')),
    items_imported INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    imported_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_imports_project ON pm_imports(project_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON pm_imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_created ON pm_imports(created_at DESC);

-- Enable RLS
ALTER TABLE pm_imports ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now
CREATE POLICY "Allow all import operations" ON pm_imports
    FOR ALL USING (true) WITH CHECK (true);

-- Add import_id to existing tables to track provenance
ALTER TABLE pm_user_stories ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES pm_imports(id);
ALTER TABLE pm_stories ADD COLUMN IF NOT EXISTS import_id UUID REFERENCES pm_imports(id);
