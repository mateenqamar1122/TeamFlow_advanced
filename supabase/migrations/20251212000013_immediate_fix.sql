-- Immediate Fix for predecessor_task_id NULL Constraint Issue
-- ==========================================================

BEGIN;

-- First, let's see what's in the task_dependencies table and fix any data issues
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_dependencies') THEN

        -- Remove any rows with NULL predecessor_task_id if they exist
        DELETE FROM task_dependencies WHERE predecessor_task_id IS NULL;
        RAISE NOTICE 'Cleaned up any NULL predecessor_task_id values';

        -- Make sure the column is properly defined as NOT NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'task_dependencies'
              AND column_name = 'predecessor_task_id'
              AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE task_dependencies ALTER COLUMN predecessor_task_id SET NOT NULL;
            RAISE NOTICE 'Set predecessor_task_id as NOT NULL';
        END IF;

        -- If depends_on_task_id column still exists, remove it to avoid confusion
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
        ) THEN
            -- First, copy data from depends_on_task_id to predecessor_task_id if predecessor_task_id is null
            UPDATE task_dependencies
            SET predecessor_task_id = depends_on_task_id
            WHERE predecessor_task_id IS NULL AND depends_on_task_id IS NOT NULL;

            -- Then drop the old column
            ALTER TABLE task_dependencies DROP COLUMN depends_on_task_id;
            RAISE NOTICE 'Migrated data from depends_on_task_id to predecessor_task_id and dropped old column';
        END IF;

    ELSE
        -- Create the table with correct structure
        CREATE TABLE task_dependencies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL,
            task_id UUID NOT NULL,
            predecessor_task_id UUID NOT NULL,
            dependency_type TEXT NOT NULL DEFAULT 'finish_to_start'
                CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
            lag_days INTEGER DEFAULT 0,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),

            -- Constraints
            CONSTRAINT unique_task_dependency UNIQUE (task_id, predecessor_task_id),
            CONSTRAINT no_self_dependency CHECK (task_id != predecessor_task_id)
        );

        -- Add foreign keys
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_predecessor_task_id_fkey
        FOREIGN KEY (predecessor_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

        -- Enable RLS
        ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

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

        RAISE NOTICE 'Created task_dependencies table with correct structure';
    END IF;
END $$;

-- Also fix the recurring_task_patterns issue while we're at it
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Remove any problematic constraints from recurring_task_patterns
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'recurring_task_patterns'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'id'
    LOOP
        EXECUTE format('ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped self-referencing constraint: %', constraint_name;
    END LOOP;

    -- Drop specific problematic constraints
    ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_fkey;
    ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_fkey1;

    RAISE NOTICE 'Cleaned up recurring_task_patterns constraints';
END $$;

COMMIT;

-- Quick verification
SELECT
    'task_dependencies structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'task_dependencies' AND table_schema = 'public'
ORDER BY ordinal_position;
