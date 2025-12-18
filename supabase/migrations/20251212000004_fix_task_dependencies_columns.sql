-- Fix task_dependencies column names to match code
-- ============================================================================

-- Check if we need to rename columns (they might already have the correct names)
DO $$
BEGIN
  -- Check if old columns exist and rename them, but only if new columns don't already exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'predecessor_task_id'
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'depends_on_task_id'
    AND table_schema = 'public'
  ) THEN
    -- Rename predecessor_task_id to depends_on_task_id
    ALTER TABLE public.task_dependencies
    RENAME COLUMN predecessor_task_id TO depends_on_task_id;

    RAISE NOTICE 'Renamed predecessor_task_id to depends_on_task_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'predecessor_task_id'
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'depends_on_task_id'
    AND table_schema = 'public'
  ) THEN
    -- Both columns exist, drop the old one
    ALTER TABLE public.task_dependencies
    DROP COLUMN predecessor_task_id;

    RAISE NOTICE 'Dropped duplicate predecessor_task_id column';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'successor_task_id'
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'task_id'
    AND table_schema = 'public'
  ) THEN
    -- Rename successor_task_id to task_id
    ALTER TABLE public.task_dependencies
    RENAME COLUMN successor_task_id TO task_id;

    RAISE NOTICE 'Renamed successor_task_id to task_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'successor_task_id'
    AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'task_id'
    AND table_schema = 'public'
  ) THEN
    -- Both columns exist, drop the old one
    ALTER TABLE public.task_dependencies
    DROP COLUMN successor_task_id;

    RAISE NOTICE 'Dropped duplicate successor_task_id column';
  END IF;

  -- Drop old foreign key constraints if they exist (handle multiple possible naming patterns)
  DECLARE
    constraint_rec RECORD;
  BEGIN
    -- Drop any foreign key constraints that reference old column names
    FOR constraint_rec IN
      SELECT constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'task_dependencies'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND (kcu.column_name = 'predecessor_task_id' OR kcu.column_name = 'successor_task_id')
    LOOP
      EXECUTE format('ALTER TABLE public.task_dependencies DROP CONSTRAINT %I', constraint_rec.constraint_name);
      RAISE NOTICE 'Dropped old foreign key constraint: %', constraint_rec.constraint_name;
    END LOOP;
  END;
END $$;

-- Now add the correct foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add task_id foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'task_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added task_id foreign key constraint';
  END IF;

  -- Add depends_on_task_id foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_depends_on_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'depends_on_task_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey
    FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added depends_on_task_id foreign key constraint';
  END IF;
END $$;

-- Update indexes to match new column names
DROP INDEX IF EXISTS idx_task_dependencies_predecessor;
DROP INDEX IF EXISTS idx_task_dependencies_successor;

-- Create new indexes with correct column names
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON public.task_dependencies(depends_on_task_id);

-- Verify the final structure
DO $$
BEGIN
  -- Check if all required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'task_id'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Column task_id does not exist in task_dependencies table';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'depends_on_task_id'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Column depends_on_task_id does not exist in task_dependencies table';
  END IF;

  RAISE NOTICE 'Task dependencies table structure is now correct';
END $$;
