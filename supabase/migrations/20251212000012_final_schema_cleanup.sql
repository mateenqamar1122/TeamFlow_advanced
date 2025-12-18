-- Final Database Schema Verification and Cleanup
-- ===============================================
-- This ensures all tables have consistent schema and proper constraints

BEGIN;

-- 1. Clean up any remaining inconsistencies in recurring_task_patterns
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Remove any self-referencing constraints on the id column
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
END $$;

-- 2. Ensure task_dependencies table has consistent schema
DO $$
BEGIN
    -- Make sure we're using predecessor_task_id consistently
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) THEN
        -- Both columns exist, drop the old one
        ALTER TABLE task_dependencies DROP COLUMN depends_on_task_id;
        RAISE NOTICE 'Dropped redundant depends_on_task_id column';
    END IF;

    -- Ensure all required columns exist with NOT NULL constraints where appropriate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN workspace_id UUID NOT NULL;
        RAISE NOTICE 'Added workspace_id column';
    END IF;

    -- Make sure columns are properly set as NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
          AND column_name = 'workspace_id'
          AND is_nullable = 'YES'
    ) THEN
        -- First set a default value for any NULL values
        UPDATE task_dependencies SET workspace_id = gen_random_uuid() WHERE workspace_id IS NULL;
        ALTER TABLE task_dependencies ALTER COLUMN workspace_id SET NOT NULL;
        RAISE NOTICE 'Set workspace_id as NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
          AND column_name = 'task_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE task_dependencies ALTER COLUMN task_id SET NOT NULL;
        RAISE NOTICE 'Set task_id as NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
          AND column_name = 'predecessor_task_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE task_dependencies ALTER COLUMN predecessor_task_id SET NOT NULL;
        RAISE NOTICE 'Set predecessor_task_id as NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
          AND column_name = 'created_by'
          AND is_nullable = 'YES'
    ) THEN
        -- Set a default user ID for any NULL values
        UPDATE task_dependencies SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
        ALTER TABLE task_dependencies ALTER COLUMN created_by SET NOT NULL;
        RAISE NOTICE 'Set created_by as NOT NULL';
    END IF;
END $$;

-- 3. Ensure all foreign key constraints exist and are correct
DO $$
BEGIN
    -- Drop and recreate all foreign key constraints to ensure consistency
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_workspace_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_predecessor_task_id_fkey;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_created_by_fkey;

    -- Add them back correctly
    ALTER TABLE task_dependencies
    ADD CONSTRAINT task_dependencies_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

    ALTER TABLE task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

    ALTER TABLE task_dependencies
    ADD CONSTRAINT task_dependencies_predecessor_task_id_fkey
    FOREIGN KEY (predecessor_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    RAISE NOTICE 'Recreated all foreign key constraints for task_dependencies';
END $$;

-- 4. Ensure proper constraints exist
DO $$
BEGIN
    -- Drop existing constraints
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS unique_task_dependency;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS no_self_dependency;

    -- Add unique constraint
    ALTER TABLE task_dependencies
    ADD CONSTRAINT unique_task_dependency
    UNIQUE (task_id, predecessor_task_id);

    -- Add check constraint to prevent self-dependencies
    ALTER TABLE task_dependencies
    ADD CONSTRAINT no_self_dependency
    CHECK (task_id != predecessor_task_id);

    RAISE NOTICE 'Added unique and check constraints';
END $$;

-- 5. Ensure RLS is properly configured
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies
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

-- 6. Final verification
DO $$
DECLARE
    table_record RECORD;
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '=== FINAL SCHEMA VERIFICATION ===';

    -- Show final table structures
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('task_dependencies', 'recurring_task_patterns')
        ORDER BY table_name
    LOOP
        RAISE NOTICE 'Table: %', table_record.table_name;

        -- Show columns
        FOR constraint_record IN
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = table_record.table_name
              AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  Column: % (%, nullable: %, default: %)',
                constraint_record.column_name,
                constraint_record.data_type,
                constraint_record.is_nullable,
                COALESCE(constraint_record.column_default, 'none');
        END LOOP;

        -- Show constraints
        FOR constraint_record IN
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = table_record.table_name
              AND table_schema = 'public'
            ORDER BY constraint_type, constraint_name
        LOOP
            RAISE NOTICE '  Constraint: % (%)',
                constraint_record.constraint_name,
                constraint_record.constraint_type;
        END LOOP;

        RAISE NOTICE '';
    END LOOP;
END $$;

COMMIT;
