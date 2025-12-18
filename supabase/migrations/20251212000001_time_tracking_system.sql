-- Time Tracking System Migration
-- ============================================================================

-- 1. TIME TRACKING TABLES
-- ============================================================================

-- Time entries table for tracking work sessions
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_billable BOOLEAN DEFAULT false,
  hourly_rate DECIMAL(10,2),
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'stopped', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time >= start_time),
  CONSTRAINT running_entry_no_end_time CHECK (
    (status = 'running' AND end_time IS NULL) OR
    (status != 'running' AND end_time IS NOT NULL)
  )
);

-- Time tracking settings per workspace
CREATE TABLE public.time_tracking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  default_hourly_rate DECIMAL(10,2),
  require_description BOOLEAN DEFAULT false,
  allow_manual_time BOOLEAN DEFAULT true,
  round_to_minutes INTEGER DEFAULT 1 CHECK (round_to_minutes IN (1, 5, 10, 15, 30)),
  working_hours JSONB DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"start": "09:00", "end": "17:00", "enabled": false},
    "sunday": {"start": "09:00", "end": "17:00", "enabled": false}
  }'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(workspace_id)
);

-- Time entry templates for common activities
CREATE TABLE public.time_entry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_billable BOOLEAN DEFAULT false,
  hourly_rate DECIMAL(10,2),
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Time reports and analytics
CREATE TABLE public.time_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('summary', 'detailed', 'project', 'user', 'billable')),
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  data JSONB,
  total_hours DECIMAL(10,2),
  total_billable_hours DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_time_entries_workspace_user ON public.time_entries(workspace_id, user_id);
CREATE INDEX idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON public.time_entries(start_time);
CREATE INDEX idx_time_entries_status ON public.time_entries(status);
CREATE INDEX idx_time_entry_templates_workspace ON public.time_entry_templates(workspace_id);
CREATE INDEX idx_time_reports_workspace ON public.time_reports(workspace_id);

-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_reports ENABLE ROW LEVEL SECURITY;

-- Time entries policies
CREATE POLICY "Users can view time entries in their workspaces" ON public.time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_entries.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can create their own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_entries.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own time entries" ON public.time_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time entries" ON public.time_entries
  FOR DELETE USING (user_id = auth.uid());

-- Time tracking settings policies
CREATE POLICY "Workspace members can view time tracking settings" ON public.time_tracking_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_tracking_settings.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Workspace admins can manage time tracking settings" ON public.time_tracking_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_tracking_settings.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
    )
  );

-- Time entry templates policies
CREATE POLICY "Users can view templates in their workspaces" ON public.time_entry_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_entry_templates.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage their own templates" ON public.time_entry_templates
  FOR ALL USING (user_id = auth.uid());

-- Time reports policies
CREATE POLICY "Users can view reports in their workspaces" ON public.time_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_reports.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can create reports in their workspaces" ON public.time_reports
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = time_reports.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own reports" ON public.time_reports
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own reports" ON public.time_reports
  FOR DELETE USING (created_by = auth.uid());

-- 4. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update time entry duration
CREATE OR REPLACE FUNCTION update_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
  ELSE
    NEW.duration_seconds = NULL;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_entry_duration
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entry_duration();

-- Function to ensure only one running timer per user per workspace
CREATE OR REPLACE FUNCTION enforce_single_running_timer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'running' THEN
    -- Stop any other running timers for this user in this workspace
    UPDATE public.time_entries
    SET status = 'stopped',
        end_time = now(),
        updated_at = now()
    WHERE workspace_id = NEW.workspace_id
      AND user_id = NEW.user_id
      AND status = 'running'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_single_running_timer
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_running_timer();

-- Function to create default time tracking settings for new workspaces
CREATE OR REPLACE FUNCTION create_default_time_tracking_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.time_tracking_settings (workspace_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_time_tracking_settings
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_time_tracking_settings();
