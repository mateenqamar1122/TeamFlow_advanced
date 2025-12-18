-- Task Dependencies and Recurring Tasks Migration
-- ============================================================================

-- 0. ENSURE TASKS TABLE EXISTS AND HAS REQUIRED COLUMNS
-- ============================================================================

-- First ensure the tasks table exists (it should already exist)
DO $$
BEGIN
  -- Check if tasks table exists, if not create basic structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
    CREATE TABLE public.tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'todo',
      assignee_name TEXT,
      assignee_avatar TEXT,
      tags JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- Add columns to tasks table for enhanced functionality
DO $$
BEGIN
  -- Add workspace_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'workspace_id' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- Add project_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'project_id' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;

  -- Add due_date if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN due_date DATE;
  END IF;

  -- Add start_date if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'start_date' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN start_date DATE;
  END IF;

  -- Add estimated_hours if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'estimated_hours' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN estimated_hours DECIMAL(5,2);
  END IF;

  -- Add is_blocked if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_blocked' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN is_blocked BOOLEAN DEFAULT false;
  END IF;

  -- Add blocked_reason if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'blocked_reason' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN blocked_reason TEXT;
  END IF;

  -- Add assignee_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assignee_id' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add created_by if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_by' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add is_recurring if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_recurring' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN is_recurring BOOLEAN DEFAULT false;
  END IF;

  -- Add recurring_pattern_id if it doesn't exist (will add constraint later)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'recurring_pattern_id' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN recurring_pattern_id UUID;
  END IF;

  -- Add parent_task_id if it doesn't exist (will add constraint later)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'parent_task_id' AND table_schema = 'public') THEN
    ALTER TABLE public.tasks ADD COLUMN parent_task_id UUID;
  END IF;
END $$;

-- 1. TASK DEPENDENCIES
-- ============================================================================

-- Task dependencies table for managing task relationships
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  task_id UUID NOT NULL,
  depends_on_task_id UUID NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent self-dependencies and duplicate dependencies
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  CONSTRAINT unique_task_dependency UNIQUE (task_id, depends_on_task_id)
);


-- 2. RECURRING TASKS
-- ============================================================================

-- Recurring task patterns table
CREATE TABLE IF NOT EXISTS public.recurring_task_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_task_id UUID,

  -- Recurrence configuration
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  interval_value INTEGER NOT NULL DEFAULT 1, -- Every X days/weeks/months/years

  -- Weekly specific: which days of week (0=Sunday, 1=Monday, etc.)
  days_of_week INTEGER[] DEFAULT NULL,

  -- Monthly specific: day of month or last day
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  is_last_day_of_month BOOLEAN DEFAULT false,

  -- Yearly specific: month and day
  month_of_year INTEGER CHECK (month_of_year BETWEEN 1 AND 12),

  -- Custom pattern (cron-like expression)
  custom_pattern TEXT,

  -- Schedule limits
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,

  -- Task generation settings
  generate_days_ahead INTEGER DEFAULT 7,
  auto_assign BOOLEAN DEFAULT true,
  auto_assign_to UUID,

  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Generated recurring tasks tracking
CREATE TABLE IF NOT EXISTS public.recurring_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL,
  task_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT unique_pattern_date UNIQUE (pattern_id, scheduled_date)
);


-- 3. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraints to task_dependencies after ensuring tables exist
DO $$
BEGIN
  -- Add workspace foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_workspace_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- Add task foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;

  -- Add depends_on_task foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_depends_on_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey
    FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;

  -- Add created_by foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_dependencies_created_by_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE public.task_dependencies
    ADD CONSTRAINT task_dependencies_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints to recurring_task_patterns
DO $$
BEGIN
  -- Add workspace foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_workspace_id_fkey'
    AND table_name = 'recurring_task_patterns'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
  END IF;

  -- Add template_task foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_template_task_id_fkey'
    AND table_name = 'recurring_task_patterns'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_template_task_id_fkey
    FOREIGN KEY (template_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
  END IF;

  -- Add auto_assign_to foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_auto_assign_to_fkey'
    AND table_name = 'recurring_task_patterns'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_auto_assign_to_fkey
    FOREIGN KEY (auto_assign_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add created_by foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_patterns_created_by_fkey'
    AND table_name = 'recurring_task_patterns'
  ) THEN
    ALTER TABLE public.recurring_task_patterns
    ADD CONSTRAINT recurring_task_patterns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints to recurring_task_instances
DO $$
BEGIN
  -- Add pattern foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_instances_pattern_id_fkey'
    AND table_name = 'recurring_task_instances'
  ) THEN
    ALTER TABLE public.recurring_task_instances
    ADD CONSTRAINT recurring_task_instances_pattern_id_fkey
    FOREIGN KEY (pattern_id) REFERENCES public.recurring_task_patterns(id) ON DELETE CASCADE;
  END IF;

  -- Add task foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recurring_task_instances_task_id_fkey'
    AND table_name = 'recurring_task_instances'
  ) THEN
    ALTER TABLE public.recurring_task_instances
    ADD CONSTRAINT recurring_task_instances_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraints to tasks table new columns
DO $$
BEGIN
  -- Add recurring_pattern_id foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_recurring_pattern_id_fkey'
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_recurring_pattern_id_fkey
    FOREIGN KEY (recurring_pattern_id) REFERENCES public.recurring_task_patterns(id) ON DELETE SET NULL;
  END IF;

  -- Add parent_task_id foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_parent_task_id_fkey'
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey
    FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_workspace ON public.task_dependencies(workspace_id);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_workspace ON public.recurring_task_patterns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_active ON public.recurring_task_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_start_date ON public.recurring_task_patterns(start_date);

CREATE INDEX IF NOT EXISTS idx_recurring_instances_pattern ON public.recurring_task_instances(pattern_id);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_scheduled_date ON public.recurring_task_instances(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON public.tasks(recurring_pattern_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);

-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_task_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_task_instances ENABLE ROW LEVEL SECURITY;

-- Task dependencies policies
DROP POLICY IF EXISTS "workspace_members_can_view_task_dependencies" ON public.task_dependencies;
CREATE POLICY "workspace_members_can_view_task_dependencies" ON public.task_dependencies
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "workspace_members_can_manage_task_dependencies" ON public.task_dependencies;
CREATE POLICY "workspace_members_can_manage_task_dependencies" ON public.task_dependencies
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Recurring patterns policies
DROP POLICY IF EXISTS "workspace_members_can_view_recurring_patterns" ON public.recurring_task_patterns;
CREATE POLICY "workspace_members_can_view_recurring_patterns" ON public.recurring_task_patterns
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "workspace_members_can_manage_recurring_patterns" ON public.recurring_task_patterns;
CREATE POLICY "workspace_members_can_manage_recurring_patterns" ON public.recurring_task_patterns
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Recurring instances policies
DROP POLICY IF EXISTS "workspace_members_can_view_recurring_instances" ON public.recurring_task_instances;
CREATE POLICY "workspace_members_can_view_recurring_instances" ON public.recurring_task_instances
  FOR SELECT USING (
    pattern_id IN (
      SELECT id FROM public.recurring_task_patterns
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_recurring_pattern_id_fkey'
  FOR ALL USING (
    pattern_id IN (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'recurring_pattern_id'
        WHERE user_id = auth.uid() AND is_active = true
      )
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'recurring_task_patterns'

-- 6. FUNCTIONS AND TRIGGERS
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_recurring_pattern_id_fkey
-- Function to check for circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()

DECLARE
  circular_found BOOLEAN := false;
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_parent_task_id_fkey'
  WITH RECURSIVE dependency_chain AS (
    -- Base case: direct dependency
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'parent_task_id'

    -- Recursive case: follow the chain
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey
    JOIN public.task_dependencies td ON dc.current_task = td.task_id
    WHERE dc.depth < 20 -- Prevent infinite recursion
  )
  SELECT EXISTS (
    SELECT 1 FROM dependency_chain
    WHERE root_task = current_task
  ) INTO circular_found;

  IF circular_found THEN
    RAISE EXCEPTION 'Circular dependency detected. Task cannot depend on itself or create a dependency loop.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent circular dependencies
DROP TRIGGER IF EXISTS check_circular_dependency_trigger ON public.task_dependencies;
CREATE TRIGGER check_circular_dependency_trigger
  BEFORE INSERT OR UPDATE ON public.task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_dependency();

-- Function to update task blocked status based on dependencies
CREATE OR REPLACE FUNCTION update_task_blocked_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update blocked status for tasks that depend on the changed task
  UPDATE public.tasks
  SET
    is_blocked = EXISTS (
      SELECT 1 FROM public.task_dependencies td
      JOIN public.tasks dependent_task ON td.depends_on_task_id = dependent_task.id
      WHERE td.task_id = tasks.id
      AND dependent_task.status NOT IN ('done', 'cancelled')
    ),
    blocked_reason = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.task_dependencies td
        JOIN public.tasks dependent_task ON td.depends_on_task_id = dependent_task.id
        WHERE td.task_id = tasks.id
        AND dependent_task.status NOT IN ('done', 'cancelled')
      ) THEN 'Waiting for dependent tasks to complete'
      ELSE NULL
    END
  WHERE id IN (
    SELECT td.task_id
    FROM public.task_dependencies td
    WHERE td.depends_on_task_id = COALESCE(NEW.id, OLD.id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update blocked status when task status changes
DROP TRIGGER IF EXISTS update_blocked_status_trigger ON public.tasks;
CREATE TRIGGER update_blocked_status_trigger
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_task_blocked_status();

-- Function to generate recurring tasks
CREATE OR REPLACE FUNCTION generate_recurring_tasks()
RETURNS INTEGER AS $$
DECLARE
  pattern RECORD;
  next_date DATE;
  task_count INTEGER := 0;
  new_task_id UUID;
  template_task RECORD;
BEGIN
  -- Loop through all active recurring patterns
  FOR pattern IN
    SELECT * FROM public.recurring_task_patterns
    WHERE is_active = true
    AND start_date <= CURRENT_DATE + INTERVAL '1 day' * COALESCE(generate_days_ahead, 7)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- Calculate next occurrence date based on pattern type
    CASE pattern.recurrence_type
      WHEN 'daily' THEN
        next_date := pattern.start_date;
        WHILE next_date <= CURRENT_DATE + INTERVAL '1 day' * pattern.generate_days_ahead LOOP
          -- Check if task already exists for this date
          IF NOT EXISTS (
            SELECT 1 FROM public.recurring_task_instances
            WHERE pattern_id = pattern.id AND scheduled_date = next_date
          ) THEN
            -- Get template task details
            SELECT * INTO template_task FROM public.tasks WHERE id = pattern.template_task_id;

            IF template_task.id IS NOT NULL THEN
              -- Create new task from template
              INSERT INTO public.tasks (
                workspace_id, title, description, priority, status,
                assignee_id, project_id, due_date, estimated_hours,
                is_recurring, recurring_pattern_id, created_by, tags
              ) VALUES (
                pattern.workspace_id,
                template_task.title || ' (' || to_char(next_date, 'YYYY-MM-DD') || ')',
                template_task.description,
                template_task.priority,
                'todo',
                COALESCE(pattern.auto_assign_to, template_task.assignee_id),
                template_task.project_id,
                next_date,
                template_task.estimated_hours,
                true,
                pattern.id,
                pattern.created_by,
                template_task.tags
              ) RETURNING id INTO new_task_id;

              -- Record the instance
              INSERT INTO public.recurring_task_instances (
                pattern_id, task_id, scheduled_date
              ) VALUES (
                pattern.id, new_task_id, next_date
              );

              task_count := task_count + 1;
            END IF;
          END IF;

          next_date := next_date + INTERVAL '1 day' * pattern.interval_value;

          -- Prevent infinite loops
          IF next_date > CURRENT_DATE + INTERVAL '1 year' THEN
            EXIT;
          END IF;
        END LOOP;

      WHEN 'weekly' THEN
        -- Weekly pattern implementation would go here
        -- For now, we'll implement a simplified version
        next_date := pattern.start_date;
        WHILE next_date <= CURRENT_DATE + INTERVAL '1 day' * pattern.generate_days_ahead LOOP
          IF NOT EXISTS (
            SELECT 1 FROM public.recurring_task_instances
            WHERE pattern_id = pattern.id AND scheduled_date = next_date
          ) THEN
            SELECT * INTO template_task FROM public.tasks WHERE id = pattern.template_task_id;

            IF template_task.id IS NOT NULL THEN
              INSERT INTO public.tasks (
                workspace_id, title, description, priority, status,
                assignee_id, project_id, due_date, estimated_hours,
                is_recurring, recurring_pattern_id, created_by, tags
              ) VALUES (
                pattern.workspace_id,
                template_task.title || ' (' || to_char(next_date, 'YYYY-MM-DD') || ')',
                template_task.description,
                template_task.priority,
                'todo',
                COALESCE(pattern.auto_assign_to, template_task.assignee_id),
                template_task.project_id,
                next_date,
                template_task.estimated_hours,
                true,
                pattern.id,
                pattern.created_by,
                template_task.tags
              ) RETURNING id INTO new_task_id;

              INSERT INTO public.recurring_task_instances (
                pattern_id, task_id, scheduled_date
              ) VALUES (
                pattern.id, new_task_id, next_date
              );

              task_count := task_count + 1;
            END IF;
          END IF;

          next_date := next_date + INTERVAL '1 week' * pattern.interval_value;
        END LOOP;
    END CASE;
  END LOOP;

  RETURN task_count;
END;
$$ LANGUAGE plpgsql;

-- 7. DATA MIGRATION AND CLEANUP
-- ============================================================================

-- Update existing tasks with workspace_id if missing
DO $$
BEGIN
  -- Only run this if there are tasks without workspace_id
  IF EXISTS (SELECT 1 FROM public.tasks WHERE workspace_id IS NULL) THEN
    -- Try to match tasks to workspaces based on user ownership
    UPDATE public.tasks
    SET workspace_id = (
      SELECT w.id
      FROM public.workspaces w
      WHERE w.owner_id = tasks.user_id
      LIMIT 1
    )
    WHERE workspace_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.workspaces w WHERE w.owner_id = tasks.user_id
    );

    -- For tasks that still don't have workspace_id, try to use the first available workspace
    UPDATE public.tasks
    SET workspace_id = (
      SELECT w.id
      FROM public.workspaces w
      LIMIT 1
    )
    WHERE workspace_id IS NULL
    AND EXISTS (SELECT 1 FROM public.workspaces LIMIT 1);
  END IF;
END $$;

-- Update tasks created_by if missing
UPDATE public.tasks
SET created_by = user_id
WHERE created_by IS NULL;

-- Ensure all tasks have the required fields
UPDATE public.tasks
SET
  is_blocked = COALESCE(is_blocked, false),
  is_recurring = COALESCE(is_recurring, false)
WHERE is_blocked IS NULL OR is_recurring IS NULL;

