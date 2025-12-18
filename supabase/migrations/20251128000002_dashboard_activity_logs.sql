-- Dashboard Enhancements & Activity Logs Migration
-- =====================================================

-- 1. DATABASE SCHEMA UPDATES
-- =====================================================

-- Add project_id column to tasks table to link tasks with projects
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add assignee_id column to tasks table for proper user assignment
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by column to tasks table to track task creator
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- 2. ACTIVITY LOGS SYSTEM
-- =====================================================

-- Create activity logs table for comprehensive tracking
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create', 'update', 'delete', 'assign', 'unassign', 'comment',
    'status_change', 'tag_add', 'tag_remove', 'member_add', 'member_remove',
    'file_upload', 'file_delete', 'mention', 'reaction', 'login', 'logout'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'task', 'project', 'comment', 'user', 'tag', 'file', 'team'
  )),
  entity_id UUID,
  entity_name TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create dashboard widgets table for customizable dashboard
CREATE TABLE public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN (
    'stats_overview', 'recent_projects', 'upcoming_tasks', 'activity_feed',
    'team_performance', 'project_progress', 'task_distribution', 'calendar',
    'notifications', 'quick_actions', 'time_tracking', 'workload'
  )),
  title TEXT NOT NULL,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1,
  height INTEGER DEFAULT 1,
  config JSONB DEFAULT '{}'::jsonb,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user preferences table for dashboard customization
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  notification_settings JSONB DEFAULT '{
    "email": {"tasks": true, "projects": true, "comments": true, "mentions": true},
    "browser": {"tasks": true, "projects": true, "comments": true, "mentions": true},
    "mobile": {"tasks": true, "projects": true, "comments": true, "mentions": true}
  }'::jsonb,
  dashboard_layout JSONB DEFAULT '[]'::jsonb,
  sidebar_collapsed BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(user_id)
);

-- Create team statistics view for dashboard
CREATE VIEW public.team_statistics AS
SELECT
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p.status != 'completed' THEN p.id END) as active_projects,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.status != 'done' THEN t.id END) as pending_tasks,
  CASE
    WHEN COUNT(DISTINCT t.id) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END)::DECIMAL / COUNT(DISTINCT t.id)) * 100, 2)
    ELSE 0
  END as completion_rate,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT al.id) as total_activities
FROM public.projects p
FULL OUTER JOIN public.tasks t ON true
FULL OUTER JOIN auth.users u ON true
FULL OUTER JOIN public.activity_logs al ON true;

-- Create recent activity view for dashboard
CREATE VIEW public.recent_activities AS
SELECT
  al.id,
  al.action_type,
  al.entity_type,
  al.entity_name,
  al.description,
  al.created_at,
  al.metadata,
  p.display_name as user_name,
  p.avatar_url as user_avatar,
  tu.email as target_user_email,
  tp.display_name as target_user_name
FROM public.activity_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
LEFT JOIN auth.users tu ON al.target_user_id = tu.id
LEFT JOIN public.profiles tp ON al.target_user_id = tp.id
ORDER BY al.created_at DESC;

-- Create project insights view for enhanced dashboard
CREATE VIEW public.project_insights AS
SELECT
  p.id,
  p.name,
  p.status,
  p.progress,
  p.due_date,
  p.created_at,
  JSON_ARRAY_LENGTH(p.members::json) as member_count,
  COUNT(t.id) as task_count,
  COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_task_count,
  COUNT(CASE WHEN t.status != 'done' THEN 1 END) as pending_task_count,
  COUNT(c.id) as comment_count,
  CASE
    WHEN COUNT(t.id) > 0
    THEN ROUND((COUNT(CASE WHEN t.status = 'done' THEN 1 END)::DECIMAL / COUNT(t.id)) * 100, 2)
    ELSE 0
  END as task_completion_rate
FROM public.projects p
LEFT JOIN public.tasks t ON p.id = t.project_id
LEFT JOIN public.comments c ON c.entity_type = 'project' AND c.entity_id = p.id
GROUP BY p.id, p.name, p.status, p.progress, p.due_date, p.created_at, p.members;

-- 3. DEFAULT DASHBOARD WIDGETS FOR NEW USERS
-- =====================================================

-- Function to create default dashboard widgets for new users
CREATE OR REPLACE FUNCTION create_default_dashboard_widgets(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.dashboard_widgets (user_id, widget_type, title, position_x, position_y, width, height, config) VALUES
  (user_uuid, 'stats_overview', 'Overview', 0, 0, 2, 1, '{"showTeamStats": true}'::jsonb),
  (user_uuid, 'recent_projects', 'Recent Projects', 2, 0, 2, 2, '{"limit": 5}'::jsonb),
  (user_uuid, 'upcoming_tasks', 'Upcoming Tasks', 0, 1, 2, 2, '{"limit": 5}'::jsonb),
  (user_uuid, 'activity_feed', 'Recent Activity', 0, 3, 4, 2, '{"limit": 10, "showUserActions": true}'::jsonb),
  (user_uuid, 'quick_actions', 'Quick Actions', 4, 0, 1, 1, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to create default user preferences
CREATE OR REPLACE FUNCTION create_default_user_preferences(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 4. ACTIVITY LOGGING FUNCTIONS
-- =====================================================

-- Function to log activities automatically
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, action_type, entity_type, entity_id, entity_name,
    target_user_id, metadata, description
  ) VALUES (
    p_user_id, p_action_type, p_entity_type, p_entity_id, p_entity_name,
    p_target_user_id, p_metadata, p_description
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGERS FOR AUTOMATIC ACTIVITY LOGGING
-- =====================================================

-- Task activity logging trigger
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      auth.uid(),
      'create',
      'task',
      NEW.id,
      NEW.title,
      NULL,
      jsonb_build_object('priority', NEW.priority, 'status', NEW.status),
      'Created task "' || NEW.title || '"'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      PERFORM log_activity(
        auth.uid(),
        'status_change',
        'task',
        NEW.id,
        NEW.title,
        NULL,
        jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status),
        'Changed task "' || NEW.title || '" status from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;

    -- Log assignment changes
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      IF NEW.assignee_id IS NOT NULL THEN
        PERFORM log_activity(
          auth.uid(),
          'assign',
          'task',
          NEW.id,
          NEW.title,
          NEW.assignee_id,
          jsonb_build_object('assignee_id', NEW.assignee_id),
          'Assigned task "' || NEW.title || '" to user'
        );
      ELSE
        PERFORM log_activity(
          auth.uid(),
          'unassign',
          'task',
          NEW.id,
          NEW.title,
          OLD.assignee_id,
          jsonb_build_object('previous_assignee_id', OLD.assignee_id),
          'Unassigned task "' || NEW.title || '"'
        );
      END IF;
    END IF;

    -- Log general updates (title, description, priority changes)
    IF OLD.title != NEW.title OR OLD.description IS DISTINCT FROM NEW.description OR OLD.priority != NEW.priority THEN
      PERFORM log_activity(
        auth.uid(),
        'update',
        'task',
        NEW.id,
        NEW.title,
        NULL,
        jsonb_build_object(
          'old_title', OLD.title,
          'new_title', NEW.title,
          'old_priority', OLD.priority,
          'new_priority', NEW.priority
        ),
        'Updated task "' || NEW.title || '"'
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      auth.uid(),
      'delete',
      'task',
      OLD.id,
      OLD.title,
      NULL,
      jsonb_build_object('status', OLD.status, 'priority', OLD.priority),
      'Deleted task "' || OLD.title || '"'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Project activity logging trigger
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      auth.uid(),
      'create',
      'project',
      NEW.id,
      NEW.name,
      NULL,
      jsonb_build_object('status', NEW.status, 'progress', NEW.progress),
      'Created project "' || NEW.name || '"'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      PERFORM log_activity(
        auth.uid(),
        'status_change',
        'project',
        NEW.id,
        NEW.name,
        NULL,
        jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status),
        'Changed project "' || NEW.name || '" status from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;

    -- Log general updates
    IF OLD.name != NEW.name OR OLD.description != NEW.description OR OLD.progress != NEW.progress THEN
      PERFORM log_activity(
        auth.uid(),
        'update',
        'project',
        NEW.id,
        NEW.name,
        NULL,
        jsonb_build_object(
          'old_name', OLD.name,
          'new_name', NEW.name,
          'old_progress', OLD.progress,
          'new_progress', NEW.progress
        ),
        'Updated project "' || NEW.name || '"'
      );
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_activity(
      auth.uid(),
      'delete',
      'project',
      OLD.id,
      OLD.name,
      NULL,
      jsonb_build_object('status', OLD.status, 'progress', OLD.progress),
      'Deleted project "' || OLD.name || '"'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Comment activity logging trigger (only if comments table exists)
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_activity(
      NEW.author_id,
      'comment',
      NEW.entity_type,
      NEW.entity_id,
      COALESCE(
        (SELECT name FROM public.projects WHERE id = NEW.entity_id AND NEW.entity_type = 'project'),
        (SELECT title FROM public.tasks WHERE id = NEW.entity_id AND NEW.entity_type = 'task')
      ),
      NULL,
      jsonb_build_object('comment_id', NEW.id, 'is_reply', NEW.parent_id IS NOT NULL),
      'Added comment on ' || NEW.entity_type
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_activity();

CREATE TRIGGER project_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION log_project_activity();

-- Only create comment trigger if comments table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
    EXECUTE 'CREATE TRIGGER comment_activity_trigger
      AFTER INSERT ON public.comments
      FOR EACH ROW EXECUTE FUNCTION log_comment_activity()';
  END IF;
END
$$;

-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Dashboard widgets indexes
CREATE INDEX idx_dashboard_widgets_user ON public.dashboard_widgets(user_id);
CREATE INDEX idx_dashboard_widgets_visible ON public.dashboard_widgets(user_id, is_visible) WHERE is_visible = true;

-- User preferences index
CREATE INDEX idx_user_preferences_user ON public.user_preferences(user_id);

-- 7. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Activity logs policies
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view activity logs for entities they have access to" ON public.activity_logs
  FOR SELECT USING (
    entity_type = 'project' AND entity_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    ) OR
    entity_type = 'task' AND entity_id IN (
      SELECT id FROM public.tasks WHERE user_id = auth.uid() OR assignee_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Dashboard widgets policies
CREATE POLICY "Users can manage their own dashboard widgets" ON public.dashboard_widgets
  FOR ALL USING (user_id = auth.uid());

-- User preferences policies
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL USING (user_id = auth.uid());
