-- Calendar View & Project Timeline Features Migration
-- =====================================================

-- 1. CALENDAR EVENTS TABLE
-- =====================================================

-- Create calendar events table for calendar view
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  event_type TEXT NOT NULL CHECK (event_type IN ('task', 'project', 'milestone', 'meeting', 'deadline')),
  entity_id UUID, -- References task or project if applicable
  entity_type TEXT CHECK (entity_type IN ('task', 'project')),
  color TEXT DEFAULT '#3b82f6',
  location TEXT,
  assignees JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring JSONB, -- Stores recurring event configuration
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. GANTT CHART ENHANCEMENTS
-- =====================================================

-- Add additional columns to tasks table for better timeline support
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_hours INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS baseline_start_date TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS baseline_end_date TIMESTAMPTZ;

-- Add additional columns to projects table for timeline support
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS baseline_start_date TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS baseline_end_date TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_hours INTEGER;

-- Create project milestones table
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  color TEXT DEFAULT '#8b5cf6',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create task dependencies table for better relationship tracking
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN (
    'finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'
  )),
  lag_days INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(predecessor_task_id, successor_task_id),
  CONSTRAINT no_self_dependency CHECK (predecessor_task_id != successor_task_id)
);

-- 3. ENHANCED VIEWS FOR CALENDAR AND TIMELINE
-- =====================================================

-- Create calendar events view that includes tasks and projects
CREATE VIEW public.calendar_events_with_entities AS
SELECT
  ce.id,
  ce.title,
  ce.description,
  ce.start_date,
  ce.end_date,
  ce.all_day,
  ce.event_type,
  ce.entity_id,
  ce.entity_type,
  ce.color,
  ce.location,
  ce.assignees,
  ce.created_by,
  ce.recurring,
  ce.metadata,
  ce.created_at,
  ce.updated_at,
  'calendar_event' as source_type
FROM public.calendar_events ce

UNION ALL

-- Include tasks as calendar events
SELECT
  t.id,
  t.title,
  t.description,
  COALESCE(t.due_date, t.created_at) as start_date,
  t.due_date as end_date,
  true as all_day,
  'task'::text as event_type,
  t.id as entity_id,
  'task'::text as entity_type,
  CASE
    WHEN t.priority = 'High' THEN '#ef4444'
    WHEN t.priority = 'Medium' THEN '#f59e0b'
    ELSE '#6b7280'
  END as color,
  null as location,
  CASE
    WHEN t.assignee_id IS NOT NULL THEN jsonb_build_array(t.assignee_id)
    ELSE '[]'::jsonb
  END as assignees,
  t.created_by,
  null as recurring,
  jsonb_build_object('priority', t.priority, 'status', t.status) as metadata,
  t.created_at,
  t.updated_at,
  'task' as source_type
FROM public.tasks t
WHERE t.due_date IS NOT NULL

UNION ALL

-- Include projects as calendar events
SELECT
  p.id,
  p.name as title,
  p.description,
  p.created_at as start_date,
  p.due_date as end_date,
  true as all_day,
  'project'::text as event_type,
  p.id as entity_id,
  'project'::text as entity_type,
  '#3b82f6' as color,
  null as location,
  COALESCE(p.members, '[]'::jsonb) as assignees,
  p.user_id as created_by,
  null as recurring,
  jsonb_build_object('status', p.status, 'progress', p.progress) as metadata,
  p.created_at,
  p.updated_at,
  'project' as source_type
FROM public.projects p

UNION ALL

-- Include milestones as calendar events
SELECT
  pm.id,
  pm.name as title,
  pm.description,
  pm.due_date as start_date,
  pm.due_date as end_date,
  true as all_day,
  'milestone'::text as event_type,
  pm.project_id as entity_id,
  'project'::text as entity_type,
  pm.color,
  null as location,
  '[]'::jsonb as assignees,
  pm.created_by,
  null as recurring,
  jsonb_build_object('status', pm.status, 'project_id', pm.project_id) as metadata,
  pm.created_at,
  pm.updated_at,
  'milestone' as source_type
FROM public.project_milestones pm;

-- Create gantt chart data view
CREATE VIEW public.gantt_chart_data AS
WITH project_stats AS (
  SELECT
    p.id as project_id,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
    MIN(COALESCE(t.created_at, p.created_at)) as earliest_start,
    MAX(COALESCE(t.due_date, p.due_date)) as latest_end
  FROM public.projects p
  LEFT JOIN public.tasks t ON t.project_id = p.id
  GROUP BY p.id
)
SELECT
  p.id,
  p.name,
  p.description,
  'project' as type,
  null as parent_id,
  COALESCE(ps.earliest_start, p.created_at) as start_date,
  COALESCE(ps.latest_end, p.due_date, p.created_at + INTERVAL '30 days') as end_date,
  COALESCE(p.progress,
    CASE
      WHEN ps.total_tasks > 0 THEN (ps.completed_tasks::float / ps.total_tasks * 100)::integer
      ELSE 0
    END
  ) as progress,
  p.status,
  'Medium' as priority,
  COALESCE(p.members, '[]'::jsonb) as assignees,
  '[]'::jsonb as dependencies,
  p.estimated_hours,
  p.actual_hours,
  p.created_at,
  p.updated_at
FROM public.projects p
LEFT JOIN project_stats ps ON ps.project_id = p.id

UNION ALL

SELECT
  t.id,
  t.title as name,
  t.description,
  'task' as type,
  t.project_id as parent_id,
  COALESCE(t.created_at, NOW()) as start_date,
  COALESCE(t.due_date, t.created_at + INTERVAL '7 days', NOW() + INTERVAL '7 days') as end_date,
  CASE
    WHEN t.status = 'done' THEN 100
    WHEN t.status = 'in-progress' THEN 50
    ELSE 0
  END as progress,
  t.status,
  t.priority,
  CASE
    WHEN t.assignee_id IS NOT NULL THEN jsonb_build_array(t.assignee_id)
    ELSE '[]'::jsonb
  END as assignees,
  COALESCE(t.dependencies, '[]'::jsonb) as dependencies,
  t.estimated_hours,
  t.actual_hours,
  t.created_at,
  t.updated_at
FROM public.tasks t

UNION ALL

SELECT
  pm.id,
  pm.name,
  pm.description,
  'milestone' as type,
  pm.project_id as parent_id,
  pm.due_date as start_date,
  pm.due_date as end_date,
  CASE WHEN pm.status = 'completed' THEN 100 ELSE 0 END as progress,
  pm.status,
  'High' as priority,
  '[]'::jsonb as assignees,
  '[]'::jsonb as dependencies,
  null as estimated_hours,
  null as actual_hours,
  pm.created_at,
  pm.updated_at
FROM public.project_milestones pm;

-- 4. FUNCTIONS FOR CALENDAR AND TIMELINE
-- =====================================================

-- Function to create recurring calendar events
CREATE OR REPLACE FUNCTION generate_recurring_events(
  event_id UUID,
  max_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year')::DATE
)
RETURNS TABLE(
  generated_id UUID,
  event_title TEXT,
  event_start_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  occurrence_date DATE
) AS $$
DECLARE
  base_event RECORD;
  iter_date DATE;
  interval_days INTEGER;
BEGIN
  -- Get the base event
  SELECT * INTO base_event FROM public.calendar_events WHERE id = event_id;

  IF base_event.recurring IS NULL THEN
    RETURN;
  END IF;

  -- Calculate interval in days
  interval_days := CASE
    WHEN base_event.recurring->>'frequency' = 'daily' THEN 1
    WHEN base_event.recurring->>'frequency' = 'weekly' THEN 7
    WHEN base_event.recurring->>'frequency' = 'monthly' THEN 30
    WHEN base_event.recurring->>'frequency' = 'yearly' THEN 365
    ELSE 1
  END * COALESCE((base_event.recurring->>'interval')::INTEGER, 1);

  iter_date := base_event.start_date::DATE;

  WHILE iter_date <= max_end_date LOOP
    generated_id := gen_random_uuid();
    event_title := base_event.title;
    event_start_date := (iter_date + (base_event.start_date::TIME))::TIMESTAMPTZ;
    event_end_date := CASE
      WHEN base_event.end_date IS NOT NULL
      THEN (iter_date + (base_event.end_date::TIME))::TIMESTAMPTZ
      ELSE NULL
    END;
    occurrence_date := iter_date;

    RETURN NEXT;

    iter_date := iter_date + (interval_days || ' days')::INTERVAL;

    -- Safety check to prevent infinite loops
    IF iter_date > (base_event.start_date::DATE + INTERVAL '10 years') THEN
      EXIT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate project critical path
CREATE OR REPLACE FUNCTION calculate_critical_path(project_uuid UUID)
RETURNS TABLE(task_id UUID, is_critical BOOLEAN, float_days INTEGER) AS $$
DECLARE
  task_record RECORD;
BEGIN
  -- Simplified critical path calculation
  -- In a real implementation, you'd use more sophisticated algorithms

  FOR task_record IN
    SELECT id, estimated_hours, dependencies
    FROM public.tasks
    WHERE project_id = project_uuid
    ORDER BY estimated_hours DESC NULLS LAST
  LOOP
    task_id := task_record.id;
    is_critical := (task_record.estimated_hours IS NOT NULL AND task_record.estimated_hours > 40);
    float_days := COALESCE(task_record.estimated_hours / 8, 0); -- Assuming 8 hours per day

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Calendar events indexes
CREATE INDEX idx_calendar_events_user ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_date_range ON public.calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_events_type ON public.calendar_events(event_type);
CREATE INDEX idx_calendar_events_entity ON public.calendar_events(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- Project milestones indexes
CREATE INDEX idx_project_milestones_project ON public.project_milestones(project_id);
CREATE INDEX idx_project_milestones_due_date ON public.project_milestones(due_date);
CREATE INDEX idx_project_milestones_status ON public.project_milestones(status);

-- Task dependencies indexes
CREATE INDEX idx_task_dependencies_predecessor ON public.task_dependencies(predecessor_task_id);
CREATE INDEX idx_task_dependencies_successor ON public.task_dependencies(successor_task_id);

-- Tasks timeline indexes
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_project_dates ON public.tasks(project_id, due_date) WHERE project_id IS NOT NULL;

-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
CREATE POLICY "Users can view their own calendar events" ON public.calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own calendar events" ON public.calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own calendar events" ON public.calendar_events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own calendar events" ON public.calendar_events
  FOR DELETE USING (user_id = auth.uid());

-- Project milestones policies
CREATE POLICY "Users can view milestones for their projects" ON public.project_milestones
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage milestones for their projects" ON public.project_milestones
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- Task dependencies policies
CREATE POLICY "Users can view task dependencies for their tasks" ON public.task_dependencies
  FOR SELECT USING (
    predecessor_task_id IN (
      SELECT id FROM public.tasks WHERE user_id = auth.uid() OR assignee_id = auth.uid()
    ) OR
    successor_task_id IN (
      SELECT id FROM public.tasks WHERE user_id = auth.uid() OR assignee_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage task dependencies for their tasks" ON public.task_dependencies
  FOR ALL USING (
    predecessor_task_id IN (
      SELECT id FROM public.tasks WHERE user_id = auth.uid()
    ) AND
    successor_task_id IN (
      SELECT id FROM public.tasks WHERE user_id = auth.uid()
    )
  );

-- 7. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update project progress based on task completion
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  project_uuid UUID;
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress INTEGER;
BEGIN
  -- Get project ID from the task
  project_uuid := COALESCE(NEW.project_id, OLD.project_id);

  IF project_uuid IS NOT NULL THEN
    -- Calculate project progress
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'done' THEN 1 END) as completed
    INTO total_tasks, completed_tasks
    FROM public.tasks
    WHERE project_id = project_uuid;

    IF total_tasks > 0 THEN
      new_progress := (completed_tasks::float / total_tasks * 100)::integer;

      UPDATE public.projects
      SET
        progress = new_progress,
        updated_at = now()
      WHERE id = project_uuid;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project progress updates
CREATE TRIGGER update_project_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_project_progress();

-- Update milestone status based on due date
CREATE OR REPLACE FUNCTION update_milestone_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-mark overdue milestones
  IF NEW.due_date < NOW() AND NEW.status = 'pending' THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for milestone status updates
CREATE TRIGGER update_milestone_status_trigger
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION update_milestone_status();
