-- Fix task_dependencies column names - ROBUST VERSION
-- ============================================================================
-- This version handles all possible states of the table safely

-- First, let's see what we're working with
DO $$
BEGIN
  RAISE NOTICE 'Current task_dependencies table structure:';
END $$;

-- Check current columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'task_dependencies'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Safe column migration
DO $$
DECLARE
  has_predecessor_id BOOLEAN;
  has_successor_id BOOLEAN;
  has_task_id BOOLEAN;
  has_depends_on_task_id BOOLEAN;
BEGIN
  -- Check what columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'predecessor_task_id'
    AND table_schema = 'public'
  ) INTO has_predecessor_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'successor_task_id'
    AND table_schema = 'public'
  ) INTO has_successor_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'task_id'
    AND table_schema = 'public'
  ) INTO has_task_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'depends_on_task_id'
    AND table_schema = 'public'
  ) INTO has_depends_on_task_id;

  RAISE NOTICE 'Column status: predecessor_task_id=%, successor_task_id=%, task_id=%, depends_on_task_id=%',
    has_predecessor_id, has_successor_id, has_task_id, has_depends_on_task_id;

  -- Drop all existing foreign key constraints first to avoid issues
  DECLARE
    constraint_rec RECORD;
  BEGIN
    FOR constraint_rec IN
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'task_dependencies'
      AND constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
    LOOP
      EXECUTE format('ALTER TABLE public.task_dependencies DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
      RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
  END;

  -- Handle predecessor_task_id -> depends_on_task_id
  IF has_predecessor_id AND NOT has_depends_on_task_id THEN
    -- Safe to rename
    ALTER TABLE public.task_dependencies RENAME COLUMN predecessor_task_id TO depends_on_task_id;
    RAISE NOTICE 'Renamed predecessor_task_id to depends_on_task_id';
  ELSIF has_predecessor_id AND has_depends_on_task_id THEN
    -- Both exist, copy data if needed and drop old column
    RAISE NOTICE 'Both predecessor_task_id and depends_on_task_id exist';
    -- Check if depends_on_task_id has data
    IF (SELECT COUNT(*) FROM public.task_dependencies WHERE depends_on_task_id IS NOT NULL) = 0
       AND (SELECT COUNT(*) FROM public.task_dependencies WHERE predecessor_task_id IS NOT NULL) > 0 THEN
      -- Copy data from old to new
      UPDATE public.task_dependencies SET depends_on_task_id = predecessor_task_id WHERE predecessor_task_id IS NOT NULL;
      RAISE NOTICE 'Copied data from predecessor_task_id to depends_on_task_id';
    END IF;
    -- Drop old column
    ALTER TABLE public.task_dependencies DROP COLUMN IF EXISTS predecessor_task_id;
    RAISE NOTICE 'Dropped duplicate predecessor_task_id column';
  ELSIF NOT has_predecessor_id AND NOT has_depends_on_task_id THEN
    -- Neither exists, create the correct one
    ALTER TABLE public.task_dependencies ADD COLUMN depends_on_task_id UUID;
    RAISE NOTICE 'Added missing depends_on_task_id column';
  END IF;

  -- Handle successor_task_id -> task_id
  IF has_successor_id AND NOT has_task_id THEN
    -- Safe to rename
    ALTER TABLE public.task_dependencies RENAME COLUMN successor_task_id TO task_id;
    RAISE NOTICE 'Renamed successor_task_id to task_id';
  ELSIF has_successor_id AND has_task_id THEN
    -- Both exist, copy data if needed and drop old column
    RAISE NOTICE 'Both successor_task_id and task_id exist';
    -- Check if task_id has data
    IF (SELECT COUNT(*) FROM public.task_dependencies WHERE task_id IS NOT NULL) = 0
       AND (SELECT COUNT(*) FROM public.task_dependencies WHERE successor_task_id IS NOT NULL) > 0 THEN
      -- Copy data from old to new
      UPDATE public.task_dependencies SET task_id = successor_task_id WHERE successor_task_id IS NOT NULL;
      RAISE NOTICE 'Copied data from successor_task_id to task_id';
    END IF;
    -- Drop old column
    ALTER TABLE public.task_dependencies DROP COLUMN IF EXISTS successor_task_id;
    RAISE NOTICE 'Dropped duplicate successor_task_id column';
  ELSIF NOT has_successor_id AND NOT has_task_id THEN
    -- Neither exists, create the correct one
    ALTER TABLE public.task_dependencies ADD COLUMN task_id UUID;
    RAISE NOTICE 'Added missing task_id column';
  END IF;

END $$;

-- Add proper constraints
DO $$
BEGIN
  -- Make columns NOT NULL if they have data
  IF (SELECT COUNT(*) FROM public.task_dependencies WHERE task_id IS NOT NULL) > 0 THEN
    ALTER TABLE public.task_dependencies ALTER COLUMN task_id SET NOT NULL;
  END IF;

  IF (SELECT COUNT(*) FROM public.task_dependencies WHERE depends_on_task_id IS NOT NULL) > 0 THEN
    ALTER TABLE public.task_dependencies ALTER COLUMN depends_on_task_id SET NOT NULL;
  END IF;

  -- Add foreign key constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added task_id foreign key constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_depends_on_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey
    FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added depends_on_task_id foreign key constraint';
  END IF;

  -- Re-add other constraints
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'no_self_dependency'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id);
    RAISE NOTICE 'Added no_self_dependency check constraint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_task_dependency'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_task_id);
    RAISE NOTICE 'Added unique_task_dependency constraint';
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_task_dependencies_predecessor;
DROP INDEX IF EXISTS idx_task_dependencies_successor;
DROP INDEX IF EXISTS idx_task_dependencies_predecessor_task_id;
DROP INDEX IF EXISTS idx_task_dependencies_successor_task_id;

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_workspace ON public.task_dependencies(workspace_id);

-- Final verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'task_id'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'FAILED: task_id column does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_dependencies'
    AND column_name = 'depends_on_task_id'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'FAILED: depends_on_task_id column does not exist';
  END IF;

  RAISE NOTICE 'SUCCESS: Task dependencies table structure is now correct!';
END $$;
