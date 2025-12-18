-- Fix recurring task patterns relationship ambiguity
-- ============================================================================

-- First, let's check what foreign key constraints actually exist
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'recurring_task_patterns' OR tc.table_name = 'tasks')
  AND (ccu.table_name = 'tasks' OR ccu.table_name = 'recurring_task_patterns')
ORDER BY tc.table_name, tc.constraint_name;

-- Now let's ensure the constraint names are what we expect
DO $$
BEGIN
  -- Check if the template_task_id foreign key has the expected name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_template_task_id_fkey'
    AND table_name = 'recurring_task_patterns'
  ) THEN
    -- Drop any existing foreign key on template_task_id
    DECLARE
      constraint_rec RECORD;
    BEGIN
      FOR constraint_rec IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'recurring_task_patterns'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'template_task_id'
      LOOP
        EXECUTE format('ALTER TABLE public.recurring_task_patterns DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
      END LOOP;
    END;

    -- Add the constraint with the expected name
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'recurring_task_patterns'
      AND column_name = 'template_task_id'
    ) THEN
      ALTER TABLE public.recurring_task_patterns
      ADD CONSTRAINT recurring_task_patterns_template_task_id_fkey
      FOREIGN KEY (template_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

      RAISE NOTICE 'Added recurring_task_patterns_template_task_id_fkey constraint';
    END IF;
  END IF;

  -- Check if the recurring_pattern_id foreign key has the expected name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_recurring_pattern_id_fkey'
    AND table_name = 'tasks'
  ) THEN
    -- Drop any existing foreign key on recurring_pattern_id
    DECLARE
      constraint_rec RECORD;
    BEGIN
      FOR constraint_rec IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'tasks'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'recurring_pattern_id'
      LOOP
        EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
      END LOOP;
    END;

    -- Add the constraint with the expected name
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tasks'
      AND column_name = 'recurring_pattern_id'
    ) THEN
      ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_recurring_pattern_id_fkey
      FOREIGN KEY (recurring_pattern_id) REFERENCES public.recurring_task_patterns(id) ON DELETE SET NULL;

      RAISE NOTICE 'Added tasks_recurring_pattern_id_fkey constraint';
    END IF;
  END IF;
END $$;

-- Show final constraint names
SELECT
    'Final constraint names:' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'recurring_task_patterns' OR tc.table_name = 'tasks')
  AND (ccu.table_name = 'tasks' OR ccu.table_name = 'recurring_task_patterns')
ORDER BY tc.table_name, tc.constraint_name;
