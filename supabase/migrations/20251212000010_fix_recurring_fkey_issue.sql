-- Fix Specific Foreign Key Constraint Issue
-- ==========================================
-- This fixes the specific error:
-- "insert or update on table 'recurring_task_patterns' violates foreign key constraint 'recurring_task_patterns_id_fkey1'"

BEGIN;

-- Log current problematic constraints
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    RAISE NOTICE 'Checking for problematic constraints on recurring_task_patterns...';

    -- Find all constraints that reference the id column as a foreign key
    FOR constraint_rec IN
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'recurring_task_patterns'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND (kcu.column_name = 'id' OR tc.constraint_name LIKE '%_id_fkey%')
    LOOP
        RAISE NOTICE 'Found constraint: % - Column: % -> %(%)',
                     constraint_rec.constraint_name,
                     constraint_rec.column_name,
                     constraint_rec.foreign_table_name,
                     constraint_rec.foreign_column_name;
    END LOOP;
END $$;

-- Drop all problematic constraints
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Drop constraints that reference the id column as a foreign key (which shouldn't exist)
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'recurring_task_patterns'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'id'
    LOOP
        EXECUTE format('ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped problematic constraint: %', constraint_name;
    END LOOP;

    -- Also drop specific known problematic constraints
    EXECUTE 'ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_fkey';
    EXECUTE 'ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_fkey1';
    EXECUTE 'ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_key';

    RAISE NOTICE 'Cleaned up all known problematic constraints';
END $$;

-- Recreate only the necessary and correct foreign key constraints
DO $$
BEGIN
    -- Only add constraints that should actually exist and make sense

    -- workspace_id should reference workspaces.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_workspace_id_fkey'
          AND table_name = 'recurring_task_patterns'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recurring_task_patterns' AND column_name = 'workspace_id'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added workspace_id foreign key';
    END IF;

    -- template_task_id should reference tasks.id (nullable)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_template_task_id_fkey'
          AND table_name = 'recurring_task_patterns'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recurring_task_patterns' AND column_name = 'template_task_id'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_template_task_id_fkey
        FOREIGN KEY (template_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added template_task_id foreign key';
    END IF;

    -- created_by should reference auth.users.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_created_by_fkey'
          AND table_name = 'recurring_task_patterns'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recurring_task_patterns' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added created_by foreign key';
    END IF;

    -- auto_assign_to should reference auth.users.id (nullable)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_auto_assign_to_fkey'
          AND table_name = 'recurring_task_patterns'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recurring_task_patterns' AND column_name = 'auto_assign_to'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_auto_assign_to_fkey
        FOREIGN KEY (auto_assign_to) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added auto_assign_to foreign key';
    END IF;

    RAISE NOTICE 'All necessary foreign key constraints have been added correctly';
END $$;

-- Verify the final constraint state
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    RAISE NOTICE 'Final constraints on recurring_task_patterns:';

    FOR constraint_rec IN
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'recurring_task_patterns'
        ORDER BY tc.constraint_type, tc.constraint_name
    LOOP
        RAISE NOTICE '  % (%) - % -> %(%)',
                     constraint_rec.constraint_name,
                     constraint_rec.constraint_type,
                     COALESCE(constraint_rec.column_name, 'N/A'),
                     COALESCE(constraint_rec.foreign_table_name, 'N/A'),
                     COALESCE(constraint_rec.foreign_column_name, 'N/A');
    END LOOP;
END $$;

COMMIT;
