-- Fix recurring_task_patterns Foreign Key Constraint Issue
-- ========================================================

BEGIN;

-- First, let's identify and drop any problematic constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop any self-referencing constraints on the id column
    FOR constraint_record IN
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
          AND kcu.column_name = 'id'  -- Problematic: primary key should not be a foreign key to itself
    LOOP
        EXECUTE format('ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        RAISE NOTICE 'Dropped problematic constraint: %', constraint_record.constraint_name;
    END LOOP;

    -- Drop specific problematic constraints that might exist
    BEGIN
        ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_fkey;
        ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_fkey1;
        ALTER TABLE recurring_task_patterns DROP CONSTRAINT IF EXISTS recurring_task_patterns_id_key;
        RAISE NOTICE 'Dropped known problematic constraints';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Some constraints did not exist: %', SQLERRM;
    END;
END $$;

-- Ensure the table has the correct structure
DO $$
BEGIN
    -- Check if table exists and create/fix columns as needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'recurring_task_patterns' AND table_schema = 'public'
    ) THEN
        -- Create the table if it doesn't exist
        CREATE TABLE recurring_task_patterns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            pattern_type TEXT NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'monthly', 'custom')),
            pattern_config JSONB NOT NULL DEFAULT '{}',
            template_task_id UUID,
            auto_assign_to UUID,
            is_active BOOLEAN DEFAULT true,
            created_by UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_generated_at TIMESTAMPTZ,
            next_generation_date TIMESTAMPTZ
        );

        RAISE NOTICE 'Created recurring_task_patterns table';
    ELSE
        -- Ensure required columns exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'recurring_task_patterns' AND column_name = 'workspace_id'
        ) THEN
            ALTER TABLE recurring_task_patterns ADD COLUMN workspace_id UUID;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'recurring_task_patterns' AND column_name = 'template_task_id'
        ) THEN
            ALTER TABLE recurring_task_patterns ADD COLUMN template_task_id UUID;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'recurring_task_patterns' AND column_name = 'created_by'
        ) THEN
            ALTER TABLE recurring_task_patterns ADD COLUMN created_by UUID;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'recurring_task_patterns' AND column_name = 'auto_assign_to'
        ) THEN
            ALTER TABLE recurring_task_patterns ADD COLUMN auto_assign_to UUID;
        END IF;
    END IF;
END $$;

-- Now add the correct foreign key constraints
DO $$
BEGIN
    -- Add workspace_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_workspace_id_fkey'
          AND table_name = 'recurring_task_patterns'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_workspace_id_fkey
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added workspace_id foreign key';
    END IF;

    -- Add template_task_id foreign key (nullable)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_template_task_id_fkey'
          AND table_name = 'recurring_task_patterns'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_template_task_id_fkey
        FOREIGN KEY (template_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added template_task_id foreign key';
    END IF;

    -- Add created_by foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_created_by_fkey'
          AND table_name = 'recurring_task_patterns'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added created_by foreign key';
    END IF;

    -- Add auto_assign_to foreign key (nullable)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'recurring_task_patterns_auto_assign_to_fkey'
          AND table_name = 'recurring_task_patterns'
    ) THEN
        ALTER TABLE recurring_task_patterns
        ADD CONSTRAINT recurring_task_patterns_auto_assign_to_fkey
        FOREIGN KEY (auto_assign_to) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added auto_assign_to foreign key';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraints: %', SQLERRM;
END $$;

-- Enable RLS
ALTER TABLE recurring_task_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "recurring_patterns_workspace_access" ON recurring_task_patterns;
    DROP POLICY IF EXISTS "recurring_patterns_create" ON recurring_task_patterns;
    DROP POLICY IF EXISTS "recurring_patterns_update" ON recurring_task_patterns;
    DROP POLICY IF EXISTS "recurring_patterns_delete" ON recurring_task_patterns;

    -- Create new policies
    CREATE POLICY "recurring_patterns_workspace_access" ON recurring_task_patterns
        FOR SELECT USING (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid() AND is_active = true
            )
        );

    CREATE POLICY "recurring_patterns_create" ON recurring_task_patterns
        FOR INSERT WITH CHECK (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid() AND is_active = true
                AND role IN ('owner', 'admin', 'manager')
            ) AND created_by = auth.uid()
        );

    CREATE POLICY "recurring_patterns_update" ON recurring_task_patterns
        FOR UPDATE USING (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid() AND is_active = true
                AND role IN ('owner', 'admin', 'manager')
            )
        );

    CREATE POLICY "recurring_patterns_delete" ON recurring_task_patterns
        FOR DELETE USING (
            workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid() AND is_active = true
                AND role IN ('owner', 'admin')
            )
        );

    RAISE NOTICE 'Created RLS policies for recurring_task_patterns';
END $$;

-- Create an updated_at trigger
DO $$
BEGIN
    -- Create or replace the updated_at trigger function if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;
    END IF;

    -- Create the trigger
    DROP TRIGGER IF EXISTS update_recurring_task_patterns_updated_at ON recurring_task_patterns;
    CREATE TRIGGER update_recurring_task_patterns_updated_at
        BEFORE UPDATE ON recurring_task_patterns
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Created updated_at trigger for recurring_task_patterns';
END $$;

COMMIT;
