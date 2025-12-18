-- Final Fix: Ensure Consistent Column Names
-- =========================================
-- This ensures the database uses depends_on_task_id consistently with the application

BEGIN;

DO $$
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'predecessor_task_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND column_name = 'depends_on_task_id'
    ) THEN
        -- Drop the foreign key constraint first
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS task_dependencies_predecessor_task_id_fkey;

        -- Rename the column
        ALTER TABLE task_dependencies RENAME COLUMN predecessor_task_id TO depends_on_task_id;

        -- Recreate the foreign key constraint with correct name
        ALTER TABLE task_dependencies
        ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

        -- Update the unique constraint
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS unique_task_dependency;
        ALTER TABLE task_dependencies DROP CONSTRAINT IF EXISTS no_self_dependency;

        ALTER TABLE task_dependencies
        ADD CONSTRAINT unique_task_dependency
        UNIQUE (task_id, depends_on_task_id);

        ALTER TABLE task_dependencies
        ADD CONSTRAINT no_self_dependency
        CHECK (task_id != depends_on_task_id);

        RAISE NOTICE 'Renamed predecessor_task_id to depends_on_task_id to match application expectations';
    END IF;

    -- Ensure the column is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_dependencies'
          AND column_name = 'depends_on_task_id'
          AND is_nullable = 'YES'
    ) THEN
        -- Clean up any NULL values first
        DELETE FROM task_dependencies WHERE depends_on_task_id IS NULL;

        -- Set as NOT NULL
        ALTER TABLE task_dependencies ALTER COLUMN depends_on_task_id SET NOT NULL;
        RAISE NOTICE 'Set depends_on_task_id as NOT NULL';
    END IF;

    -- Verify the final schema
    RAISE NOTICE 'Final task_dependencies schema verification:';
    FOR col_record IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'task_dependencies' AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  Column: % (%, nullable: %)', col_record.column_name, col_record.data_type, col_record.is_nullable;
    END LOOP;
END $$;

COMMIT;
