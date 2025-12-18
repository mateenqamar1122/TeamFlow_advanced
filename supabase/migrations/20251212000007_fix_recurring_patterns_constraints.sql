-- Fix foreign key constraint issues in recurring_task_patterns
-- ============================================================================

-- First, let's check what constraints exist on recurring_task_patterns table
SELECT
    'Current constraints on recurring_task_patterns:' as info,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'recurring_task_patterns'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Remove problematic constraints that might be causing issues
DO $$
BEGIN
  -- Drop the problematic recurring_task_patterns_id_fkey if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_id_fkey'
    AND table_name = 'recurring_task_patterns'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    DROP CONSTRAINT recurring_task_patterns_id_fkey;
    RAISE NOTICE 'Dropped problematic recurring_task_patterns_id_fkey constraint';
  END IF;

  -- Drop any self-referencing constraints that shouldn't exist
  DECLARE
    constraint_rec RECORD;
  BEGIN
    FOR constraint_rec IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'recurring_task_patterns'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'recurring_task_patterns'  -- Self-referencing
      AND kcu.column_name = 'id'  -- Primary key column
    LOOP
      EXECUTE format('ALTER TABLE public.recurring_task_patterns DROP CONSTRAINT %I', constraint_rec.constraint_name);
      RAISE NOTICE 'Dropped self-referencing constraint: %', constraint_rec.constraint_name;
    END LOOP;
  END;

  -- Ensure proper constraints exist
  -- Add template_task_id foreign key if it doesn't exist and column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_template_task_id_fkey'
    AND table_name = 'recurring_task_patterns'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_task_patterns'
    AND column_name = 'template_task_id'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_template_task_id_fkey
    FOREIGN KEY (template_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added template_task_id foreign key constraint';
  END IF;

  -- Add workspace_id foreign key if it doesn't exist and column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_workspace_id_fkey'
    AND table_name = 'recurring_task_patterns'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_task_patterns'
    AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added workspace_id foreign key constraint';
  END IF;

  -- Add created_by foreign key if it doesn't exist and column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_created_by_fkey'
    AND table_name = 'recurring_task_patterns'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_task_patterns'
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added created_by foreign key constraint';
  END IF;

  -- Add auto_assign_to foreign key if it doesn't exist and column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_auto_assign_to_fkey'
    AND table_name = 'recurring_task_patterns'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_task_patterns'
    AND column_name = 'auto_assign_to'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_auto_assign_to_fkey
    FOREIGN KEY (auto_assign_to) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added auto_assign_to foreign key constraint';
  END IF;
END $$;

-- Show final constraints
SELECT
    'Final constraints on recurring_task_patterns:' as info,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'recurring_task_patterns'
  AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;
