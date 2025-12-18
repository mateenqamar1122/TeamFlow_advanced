-- Enhanced Features Migration: Status Workflow, Comments System, Tag System
-- ============================================================================

-- 1. ENHANCED STATUS WORKFLOW
-- ============================================================================

-- Create status workflow table for flexible status management
CREATE TABLE public.status_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project')),
  statuses JSONB NOT NULL DEFAULT '[]'::jsonb,
  transitions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default task workflow
INSERT INTO public.status_workflows (name, description, entity_type, statuses, transitions, is_default) VALUES
('Default Task Workflow', 'Standard task management workflow', 'task',
 '[
   {"id": "backlog", "name": "Backlog", "color": "#6b7280", "order": 1},
   {"id": "todo", "name": "To Do", "color": "#3b82f6", "order": 2},
   {"id": "in-progress", "name": "In Progress", "color": "#f59e0b", "order": 3},
   {"id": "review", "name": "In Review", "color": "#8b5cf6", "order": 4},
   {"id": "testing", "name": "Testing", "color": "#06b6d4", "order": 5},
   {"id": "done", "name": "Done", "color": "#10b981", "order": 6},
   {"id": "cancelled", "name": "Cancelled", "color": "#ef4444", "order": 7}
 ]'::jsonb,
 '{
   "backlog": ["todo", "cancelled"],
   "todo": ["in-progress", "cancelled"],
   "in-progress": ["review", "testing", "done", "todo", "cancelled"],
   "review": ["in-progress", "testing", "done", "todo"],
   "testing": ["done", "in-progress", "review"],
   "done": ["in-progress", "review"],
   "cancelled": ["todo", "backlog"]
 }'::jsonb,
 true);

-- Insert default project workflow
INSERT INTO public.status_workflows (name, description, entity_type, statuses, transitions, is_default) VALUES
('Default Project Workflow', 'Standard project management workflow', 'project',
 '[
   {"id": "planning", "name": "Planning", "color": "#6b7280", "order": 1},
   {"id": "active", "name": "Active", "color": "#10b981", "order": 2},
   {"id": "on-hold", "name": "On Hold", "color": "#f59e0b", "order": 3},
   {"id": "review", "name": "In Review", "color": "#8b5cf6", "order": 4},
   {"id": "completed", "name": "Completed", "color": "#3b82f6", "order": 5},
   {"id": "cancelled", "name": "Cancelled", "color": "#ef4444", "order": 6}
 ]'::jsonb,
 '{
   "planning": ["active", "cancelled"],
   "active": ["on-hold", "review", "completed", "cancelled"],
   "on-hold": ["active", "cancelled"],
   "review": ["active", "completed"],
   "completed": ["active"],
   "cancelled": ["planning"]
 }'::jsonb,
 true);

-- Add workflow_id to existing tables
ALTER TABLE public.tasks ADD COLUMN workflow_id UUID REFERENCES public.status_workflows(id);
ALTER TABLE public.projects ADD COLUMN workflow_id UUID REFERENCES public.status_workflows(id);

-- Update existing tasks and projects with default workflows
UPDATE public.tasks SET workflow_id = (
  SELECT id FROM public.status_workflows
  WHERE entity_type = 'task' AND is_default = true
  LIMIT 1
);

UPDATE public.projects SET workflow_id = (
  SELECT id FROM public.status_workflows
  WHERE entity_type = 'project' AND is_default = true
  LIMIT 1
);

-- Create status change history table
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project')),
  entity_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. ENHANCED COMMENTS SYSTEM
-- ============================================================================

-- Create comments table with threading support
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project')),
  entity_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_edited BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure we don't have circular references in threading
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- Create comment mentions table for notification tracking
CREATE TABLE public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(comment_id, mentioned_user_id)
);

-- 3. ENHANCED TAG SYSTEM
-- ============================================================================

-- Create tag categories table
CREATE TABLE public.tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure system categories don't have user_id and vice versa
  CONSTRAINT tag_category_ownership CHECK (
    (is_system = true AND user_id IS NULL) OR
    (is_system = false AND user_id IS NOT NULL)
  )
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',
  category_id UUID REFERENCES public.tag_categories(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Ensure uniqueness per user for custom tags, global for system tags
  UNIQUE(name, user_id),

  -- Ensure system tags don't have user_id and vice versa
  CONSTRAINT tag_ownership CHECK (
    (is_system = true AND user_id IS NULL) OR
    (is_system = false AND user_id IS NOT NULL)
  )
);

-- Create entity tags junction table
CREATE TABLE public.entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project')),
  entity_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(entity_type, entity_id, tag_id)
);

-- Insert default system tag categories
INSERT INTO public.tag_categories (name, description, color, icon, is_system) VALUES
('Priority', 'Task and project priority levels', '#ef4444', 'AlertCircle', true),
('Type', 'Task and project types', '#3b82f6', 'Tag', true),
('Department', 'Organizational departments', '#10b981', 'Building', true),
('Status Labels', 'Additional status indicators', '#f59e0b', 'Flag', true);

-- Insert default system tags
INSERT INTO public.tags (name, description, color, category_id, is_system) VALUES
-- Priority tags
('Critical', 'Highest priority - needs immediate attention', '#dc2626',
 (SELECT id FROM public.tag_categories WHERE name = 'Priority'), true),
('High Priority', 'High priority task', '#ef4444',
 (SELECT id FROM public.tag_categories WHERE name = 'Priority'), true),
('Normal', 'Standard priority', '#6b7280',
 (SELECT id FROM public.tag_categories WHERE name = 'Priority'), true),
('Low Priority', 'Can be done when time permits', '#9ca3af',
 (SELECT id FROM public.tag_categories WHERE name = 'Priority'), true),

-- Type tags
('Bug Fix', 'Bug fix or issue resolution', '#dc2626',
 (SELECT id FROM public.tag_categories WHERE name = 'Type'), true),
('Feature', 'New feature development', '#10b981',
 (SELECT id FROM public.tag_categories WHERE name = 'Type'), true),
('Enhancement', 'Improvement to existing feature', '#3b82f6',
 (SELECT id FROM public.tag_categories WHERE name = 'Type'), true),
('Research', 'Research or investigation task', '#8b5cf6',
 (SELECT id FROM public.tag_categories WHERE name = 'Type'), true),
('Documentation', 'Documentation related work', '#06b6d4',
 (SELECT id FROM public.tag_categories WHERE name = 'Type'), true),

-- Department tags
('Engineering', 'Development and technical work', '#3b82f6',
 (SELECT id FROM public.tag_categories WHERE name = 'Department'), true),
('Design', 'Design and UX related work', '#ec4899',
 (SELECT id FROM public.tag_categories WHERE name = 'Department'), true),
('Marketing', 'Marketing and promotion activities', '#f59e0b',
 (SELECT id FROM public.tag_categories WHERE name = 'Department'), true),
('Sales', 'Sales related activities', '#10b981',
 (SELECT id FROM public.tag_categories WHERE name = 'Department'), true),

-- Status labels
('Blocked', 'Task is blocked by external dependency', '#ef4444',
 (SELECT id FROM public.tag_categories WHERE name = 'Status Labels'), true),
('Urgent', 'Requires urgent attention', '#dc2626',
 (SELECT id FROM public.tag_categories WHERE name = 'Status Labels'), true),
('Needs Review', 'Waiting for review or approval', '#8b5cf6',
 (SELECT id FROM public.tag_categories WHERE name = 'Status Labels'), true);

-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Comments indexes
CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX idx_comments_author ON public.comments(author_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_created ON public.comments(created_at DESC);

-- Status history indexes
CREATE INDEX idx_status_history_entity ON public.status_history(entity_type, entity_id);
CREATE INDEX idx_status_history_user ON public.status_history(changed_by);
CREATE INDEX idx_status_history_created ON public.status_history(created_at DESC);

-- Tag related indexes
CREATE INDEX idx_tags_user ON public.tags(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_tags_category ON public.tags(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_entity_tags_entity ON public.entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag ON public.entity_tags(tag_id);

-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Status workflows policies
ALTER TABLE public.status_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status workflows are viewable by everyone" ON public.status_workflows FOR SELECT USING (true);

-- Status history policies
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view status history for their entities" ON public.status_history
FOR SELECT USING (
  (entity_type = 'task' AND EXISTS (
    SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
  )) OR
  (entity_type = 'project' AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create status history for their entities" ON public.status_history
FOR INSERT WITH CHECK (
  changed_by = auth.uid() AND (
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
    )) OR
    (entity_type = 'project' AND EXISTS (
      SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
    ))
  )
);

-- Comments policies
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view comments for their entities" ON public.comments
FOR SELECT USING (
  (entity_type = 'task' AND EXISTS (
    SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
  )) OR
  (entity_type = 'project' AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create comments for their entities" ON public.comments
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND (
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
    )) OR
    (entity_type = 'project' AND EXISTS (
      SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE USING (author_id = auth.uid());

-- Comment mentions policies
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own mentions" ON public.comment_mentions
FOR SELECT USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users can update their own mentions" ON public.comment_mentions
FOR UPDATE USING (mentioned_user_id = auth.uid());

-- Tag categories policies
ALTER TABLE public.tag_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view tag categories" ON public.tag_categories FOR SELECT USING (true);
CREATE POLICY "Users can create their own tag categories" ON public.tag_categories
FOR INSERT WITH CHECK (user_id = auth.uid() OR is_system = true);
CREATE POLICY "Users can update their own tag categories" ON public.tag_categories
FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own tag categories" ON public.tag_categories
FOR DELETE USING (user_id = auth.uid());

-- Tags policies
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Users can create their own tags" ON public.tags
FOR INSERT WITH CHECK (user_id = auth.uid() OR is_system = true);
CREATE POLICY "Users can update their own tags" ON public.tags
FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own tags" ON public.tags
FOR DELETE USING (user_id = auth.uid());

-- Entity tags policies
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view entity tags for their entities" ON public.entity_tags
FOR SELECT USING (
  (entity_type = 'task' AND EXISTS (
    SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
  )) OR
  (entity_type = 'project' AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create entity tags for their entities" ON public.entity_tags
FOR INSERT WITH CHECK (
  added_by = auth.uid() AND (
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
    )) OR
    (entity_type = 'project' AND EXISTS (
      SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can delete entity tags for their entities" ON public.entity_tags
FOR DELETE USING (
  (entity_type = 'task' AND EXISTS (
    SELECT 1 FROM public.tasks WHERE id = entity_id AND user_id = auth.uid()
  )) OR
  (entity_type = 'project' AND EXISTS (
    SELECT 1 FROM public.projects WHERE id = entity_id AND user_id = auth.uid()
  ))
);

-- 6. TRIGGERS FOR AUTOMATED UPDATES
-- ============================================================================

-- Update timestamp triggers
CREATE TRIGGER update_status_workflows_updated_at
BEFORE UPDATE ON public.status_workflows
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update tag usage count
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tags
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to maintain tag usage counts
CREATE TRIGGER update_tag_usage_count_trigger
AFTER INSERT OR DELETE ON public.entity_tags
FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();

-- Function to create status history entry
CREATE OR REPLACE FUNCTION public.create_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create history if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_history (
      entity_type,
      entity_id,
      from_status,
      to_status,
      changed_by
    ) VALUES (
      CASE
        WHEN TG_TABLE_NAME = 'tasks' THEN 'task'
        WHEN TG_TABLE_NAME = 'projects' THEN 'project'
      END,
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers to track status changes
CREATE TRIGGER track_task_status_changes
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.create_status_history();

CREATE TRIGGER track_project_status_changes
AFTER UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.create_status_history();
