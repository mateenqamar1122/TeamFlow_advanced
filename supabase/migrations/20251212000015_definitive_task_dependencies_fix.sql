-- Definitive Fix for Task Dependencies Column Issues
-- =================================================
-- This will check the current state and fix all column naming issues

BEGIN;

DO $$
DECLARE
    col_record RECORD;
    has_task_id BOOLEAN := FALSE;
    has_depends_on_task_id BOOLEAN := FALSE;
    has_predecessor_task_id BOOLEAN := FALSE;
    has_successor_task_id BOOLEAN := FALSE;
    has_workspace_id BOOLEAN := FALSE;
    has_created_by BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE 'Starting task_dependencies table analysis and fix...';

    -- Check current columns
    FOR col_record IN
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Found column: % (%, nullable: %, default: %)',
            col_record.column_name,
            col_record.data_type,
            col_record.is_nullable,
            COALESCE(col_record.column_default, 'none');

        -- Set flags based on what columns exist
        CASE col_record.column_name
            WHEN 'task_id' THEN has_task_id := TRUE;
            WHEN 'depends_on_task_id' THEN has_depends_on_task_id := TRUE;
            WHEN 'predecessor_task_id' THEN has_predecessor_task_id := TRUE;
            WHEN 'successor_task_id' THEN has_successor_task_id := TRUE;
            WHEN 'workspace_id' THEN has_workspace_id := TRUE;
            WHEN 'created_by' THEN has_created_by := TRUE;
            ELSE NULL;
        END CASE;
    END LOOP;

    RAISE NOTICE 'Column status: task_id=%, depends_on_task_id=%, predecessor_task_id=%, successor_task_id=%, workspace_id=%, created_by=%',
        has_task_id, has_depends_on_task_id, has_predecessor_task_id, has_successor_task_id, has_workspace_id, has_created_by;

    -- Drop all foreign key constraints first to avoid issues
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_depends_on_task_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_predecessor_task_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_successor_task_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_workspace_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_created_by_fkey;

    -- Drop unique constraints
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS unique_task_dependency;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS no_self_dependency;

    RAISE NOTICE 'Dropped all existing constraints';

    -- Fix column naming issues

    -- Ensure we have task_id (the main task that depends on another)
    IF has_successor_task_id AND NOT has_task_id THEN
        ALTER TABLE task_dependencies RENAME COLUMN successor_task_id TO task_id;
        has_task_id := TRUE;
        has_successor_task_id := FALSE;
        RAISE NOTICE 'Renamed successor_task_id to task_id';
    ELSIF has_successor_task_id AND has_task_id THEN
        -- Both exist, copy data and drop duplicate
        UPDATE task_dependencies SET task_id = successor_task_id WHERE task_id IS NULL AND successor_task_id IS NOT NULL;
        ALTER TABLE task_dependencies DROP COLUMN successor_task_id;
        has_successor_task_id := FALSE;
        RAISE NOTICE 'Merged successor_task_id into task_id and dropped duplicate';
    END IF;

    -- Ensure we have depends_on_task_id (the task that must be completed first)
    IF has_predecessor_task_id AND NOT has_depends_on_task_id THEN
        ALTER TABLE task_dependencies RENAME COLUMN predecessor_task_id TO depends_on_task_id;
        has_depends_on_task_id := TRUE;
        has_predecessor_task_id := FALSE;
        RAISE NOTICE 'Renamed predecessor_task_id to depends_on_task_id';
    ELSIF has_predecessor_task_id AND has_depends_on_task_id THEN
        -- Both exist, copy data and drop duplicate
        UPDATE task_dependencies SET depends_on_task_id = predecessor_task_id WHERE depends_on_task_id IS NULL AND predecessor_task_id IS NOT NULL;
        ALTER TABLE task_dependencies DROP COLUMN predecessor_task_id;
        has_predecessor_task_id := FALSE;
        RAISE NOTICE 'Merged predecessor_task_id into depends_on_task_id and dropped duplicate';
    END IF;

    -- Add missing columns
    IF NOT has_task_id THEN
        ALTER TABLE task_dependencies ADD COLUMN task_id UUID;
        RAISE NOTICE 'Added missing task_id column';
    END IF;

    IF NOT has_depends_on_task_id THEN
        ALTER TABLE task_dependencies ADD COLUMN depends_on_task_id UUID;
        RAISE NOTICE 'Added missing depends_on_task_id column';
    END IF;

    IF NOT has_workspace_id THEN
        ALTER TABLE task_dependencies ADD COLUMN workspace_id UUID;
        RAISE NOTICE 'Added missing workspace_id column';
    END IF;

    IF NOT has_created_by THEN
        ALTER TABLE task_dependencies ADD COLUMN created_by UUID;
        RAISE NOTICE 'Added missing created_by column';
    END IF;

    -- Ensure other required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'dependency_type'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN dependency_type TEXT DEFAULT 'finish_to_start'
            CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'));
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

    -- Clean up any NULL values that would violate NOT NULL constraints
    DELETE FROM task_dependencies WHERE task_id IS NULL OR depends_on_task_id IS NULL;
    RAISE NOTICE 'Cleaned up rows with NULL required values';

    -- Set NOT NULL constraints
    ALTER TABLE task_dependencies ALTER COLUMN task_id SET NOT NULL;
    ALTER TABLE task_dependencies ALTER COLUMN depends_on_task_id SET NOT NULL;

    -- Set default values for other columns if they're NULL
    UPDATE task_dependencies SET workspace_id = gen_random_uuid() WHERE workspace_id IS NULL;
    UPDATE task_dependencies SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
    UPDATE task_dependencies SET dependency_type = 'finish_to_start' WHERE dependency_type IS NULL;
    UPDATE task_dependencies SET lag_days = 0 WHERE lag_days IS NULL;
    UPDATE task_dependencies SET created_at = NOW() WHERE created_at IS NULL;

    -- Set NOT NULL on required columns
    ALTER TABLE task_dependencies ALTER COLUMN workspace_id SET NOT NULL;
    ALTER TABLE task_dependencies ALTER COLUMN created_by SET NOT NULL;
    ALTER TABLE task_dependencies ALTER COLUMN dependency_type SET NOT NULL;

    RAISE NOTICE 'Set NOT NULL constraints and default values';

    -- Recreate foreign key constraints
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

    RAISE NOTICE 'Recreated foreign key constraints';

    -- Add unique constraint and check constraint
    ALTER TABLE task_dependencies
    ADD CONSTRAINT unique_task_dependency
    UNIQUE (task_id, depends_on_task_id);

    ALTER TABLE task_dependencies
    ADD CONSTRAINT no_self_dependency
    CHECK (task_id != depends_on_task_id);

    RAISE NOTICE 'Added unique and check constraints';

    -- Final verification
    RAISE NOTICE 'Final task_dependencies table structure:';
    FOR col_record IN
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  Column: % (%, nullable: %, default: %)',
            col_record.column_name,
            col_record.data_type,
            col_record.is_nullable,
            COALESCE(col_record.column_default, 'none');
    END LOOP;

    RAISE NOTICE 'Task dependencies table structure has been fixed successfully!';
END $$;

-- Enable RLS and create policies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_members_can_view_task_dependencies" ON task_dependencies;
DROP POLICY IF EXISTS "workspace_members_can_manage_task_dependencies" ON task_dependencies;

-- Create RLS policies
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_workspace_id ON task_dependencies(workspace_id);

COMMIT;
