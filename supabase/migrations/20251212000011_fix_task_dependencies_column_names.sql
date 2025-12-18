-- Fix Task Dependencies Column Name Issue
-- =====================================
-- This fixes the error: null value in column "predecessor_task_id" violates not-null constraint

BEGIN;

-- First, let's check what columns actually exist in the task_dependencies table
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Current columns in task_dependencies table:';
    FOR col_record IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    END LOOP;
END $$;

-- Fix the column naming issue
DO $$
BEGIN
    -- Check if we have predecessor_task_id but need depends_on_task_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) THEN
        -- Rename predecessor_task_id to depends_on_task_id
        ALTER TABLE task_dependencies RENAME COLUMN predecessor_task_id TO depends_on_task_id;
        RAISE NOTICE 'Renamed predecessor_task_id to depends_on_task_id';
    END IF;

    -- Check if we have depends_on_task_id but the application expects predecessor_task_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) THEN
        -- Rename depends_on_task_id to predecessor_task_id
        ALTER TABLE task_dependencies RENAME COLUMN depends_on_task_id TO predecessor_task_id;
        RAISE NOTICE 'Renamed depends_on_task_id to predecessor_task_id';
    END IF;

    -- If neither column exists, add predecessor_task_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
        AND column_name IN ('predecessor_task_id', 'depends_on_task_id')
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN predecessor_task_id UUID NOT NULL;
        RAISE NOTICE 'Added predecessor_task_id column';
    END IF;

    -- Ensure task_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN task_id UUID NOT NULL;
        RAISE NOTICE 'Added task_id column';
    END IF;

    -- Ensure workspace_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE task_dependencies ADD COLUMN workspace_id UUID NOT NULL;
        RAISE NOTICE 'Added workspace_id column';
    END IF;
END $$;

-- Remove and recreate foreign key constraints with correct column names
DO $$
BEGIN
    -- Drop existing constraints that might be using wrong column names
    BEGIN
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_depends_on_task_id_fkey;
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_predecessor_task_id_fkey;
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_fkey;
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_workspace_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraints';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Some constraints did not exist: %', SQLERRM;
    END;

    -- Add correct foreign key constraints
    -- Task ID constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_task_id_fkey
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added task_id foreign key constraint';
    END IF;

    -- Predecessor/Depends on task ID constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_predecessor_task_id_fkey
        FOREIGN KEY (predecessor_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added predecessor_task_id foreign key constraint';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added depends_on_task_id foreign key constraint';
    END IF;

    -- Workspace ID constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added workspace_id foreign key constraint';
    END IF;

    -- Created by constraint if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added created_by foreign key constraint';
    END IF;
END $$;

-- Add unique constraint to prevent duplicate dependencies
DO $$
BEGIN
    -- Drop existing unique constraint if it exists
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS unique_task_dependency;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_predecessor_task_id_key;
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_task_id_depends_on_task_id_key;

    -- Add new unique constraint based on which column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT unique_task_dependency
        UNIQUE (task_id, predecessor_task_id);
        RAISE NOTICE 'Added unique constraint for task_id, predecessor_task_id';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT unique_task_dependency
        UNIQUE (task_id, depends_on_task_id);
        RAISE NOTICE 'Added unique constraint for task_id, depends_on_task_id';
    END IF;
END $$;

-- Add check constraint to prevent self-dependencies
DO $$
BEGIN
    ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS no_self_dependency;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT no_self_dependency
        CHECK (task_id != predecessor_task_id);
        RAISE NOTICE 'Added self-dependency check constraint for predecessor_task_id';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) THEN
        ALTER TABLE task_dependencies
        ADD CONSTRAINT no_self_dependency
        CHECK (task_id != depends_on_task_id);
        RAISE NOTICE 'Added self-dependency check constraint for depends_on_task_id';
    END IF;
END $$;

-- Show final table structure
DO $$
DECLARE
    col_record RECORD;
    constraint_record RECORD;
BEGIN
    RAISE NOTICE 'Final task_dependencies table structure:';
    RAISE NOTICE 'Columns:';
    FOR col_record IN
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %, default: %)',
            col_record.column_name,
            col_record.data_type,
            col_record.is_nullable,
            COALESCE(col_record.column_default, 'none');
    END LOOP;

    RAISE NOTICE 'Constraints:';
    FOR constraint_record IN
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'task_dependencies' AND table_schema = 'public'
        ORDER BY constraint_type, constraint_name
    LOOP
        RAISE NOTICE '  %: %', constraint_record.constraint_name, constraint_record.constraint_type;
    END LOOP;
END $$;

COMMIT;
