-- Ultimate Fix - Task Dependencies Schema Correction
-- =================================================
-- This migration will fix the successor_task_id issue once and for all
-- Run this as migration: 20251213000001_ultimate_task_dependencies_fix.sql

BEGIN;

-- Log what we're doing
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Starting ultimate task_dependencies fix...';

    -- Show current problematic columns
    FOR rec IN
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Found column: %', rec.column_name;
    END LOOP;
END $$;

-- Drop all problematic constraints
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_successor_task_id_fkey;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_predecessor_task_id_fkey;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_depends_on_task_id_fkey;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_fkey;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_workspace_id_fkey;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_created_by_fkey;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS unique_task_dependency;
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS no_self_dependency;

-- Fix column names step by step
DO $$
BEGIN
    -- Fix successor_task_id -> depends_on_task_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'successor_task_id'
    ) THEN
        ALTER TABLE task_dependencies RENAME COLUMN successor_task_id TO depends_on_task_id;
        RAISE NOTICE 'Renamed successor_task_id to depends_on_task_id';
    END IF;

    -- Fix predecessor_task_id -> task_id (if predecessor_task_id exists but task_id doesn't)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE task_dependencies RENAME COLUMN predecessor_task_id TO task_id;
        RAISE NOTICE 'Renamed predecessor_task_id to task_id';
    END IF;

    -- If both predecessor_task_id and task_id exist, merge them
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'task_id'
    ) THEN
        UPDATE task_dependencies SET task_id = predecessor_task_id WHERE task_id IS NULL;
        ALTER TABLE task_dependencies DROP COLUMN predecessor_task_id;
        RAISE NOTICE 'Merged predecessor_task_id into task_id';
    END IF;

    -- Ensure required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN workspace_id UUID;
        RAISE NOTICE 'Added workspace_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added created_by column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'dependency_type'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN dependency_type TEXT DEFAULT 'finish_to_start';
        RAISE NOTICE 'Added dependency_type column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'lag_days'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN lag_days INTEGER DEFAULT 0;
        RAISE NOTICE 'Added lag_days column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
END $$;

-- Clean up bad data and set proper defaults
UPDATE task_dependencies SET
    workspace_id = (SELECT id FROM workspaces LIMIT 1)
WHERE workspace_id IS NULL;

UPDATE task_dependencies SET
    created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE created_by IS NULL;

UPDATE task_dependencies SET
    dependency_type = 'finish_to_start'
WHERE dependency_type IS NULL;

UPDATE task_dependencies SET
    lag_days = 0
WHERE lag_days IS NULL;

UPDATE task_dependencies SET
    created_at = NOW()
WHERE created_at IS NULL;

-- Remove any rows that would still violate constraints
DELETE FROM task_dependencies WHERE task_id IS NULL OR depends_on_task_id IS NULL;

-- Set NOT NULL constraints
ALTER TABLE task_dependencies ALTER COLUMN task_id SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN depends_on_task_id SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE task_dependencies ALTER COLUMN dependency_type SET NOT NULL;

-- Add constraint for dependency_type
ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_dependency_type_check;
ALTER TABLE task_dependencies ADD CONSTRAINT task_dependencies_dependency_type_check
CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'));

-- Recreate all foreign key constraints
ALTER TABLE task_dependencies
ADD CONSTRAINT task_dependencies_workspace_id_fkey
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE task_dependencies
ADD CONSTRAINT task_dependencies_task_id_fkey
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_dependencies
ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey
FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_dependencies
ADD CONSTRAINT task_dependencies_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE task_dependencies
ADD CONSTRAINT unique_task_dependency
UNIQUE (task_id, depends_on_task_id);

-- Add check constraint
ALTER TABLE task_dependencies
ADD CONSTRAINT no_self_dependency
CHECK (task_id != depends_on_task_id);

-- Ensure RLS is enabled
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
DROP POLICY IF EXISTS "workspace_members_can_view_task_dependencies" ON task_dependencies;
DROP POLICY IF EXISTS "workspace_members_can_manage_task_dependencies" ON task_dependencies;

CREATE POLICY "workspace_members_can_view_task_dependencies" ON task_dependencies
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "workspace_members_can_manage_task_dependencies" ON task_dependencies
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_workspace_id ON task_dependencies(workspace_id);

-- Final verification
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'FINAL RESULT - task_dependencies table schema:';
    FOR rec IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  Column: % (%, nullable: %)', rec.column_name, rec.data_type, rec.is_nullable;
    END LOOP;

    RAISE NOTICE 'SUCCESS: task_dependencies table has been fixed!';
END $$;

COMMIT;
