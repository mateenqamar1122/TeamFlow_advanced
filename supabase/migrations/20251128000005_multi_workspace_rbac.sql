-- Multi-Workspace Support & Role-Based Access Control (RBAC) Migration
-- =====================================================

-- 1. WORKSPACE SYSTEM
-- =====================================================

-- Create workspace table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{
    "timezone": "UTC",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h",
    "currency": "USD",
    "features": {
      "time_tracking": true,
      "calendar": true,
      "gantt": true,
      "reports": true
    }
  }'::jsonb,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create workspace member roles enum
CREATE TYPE public.workspace_role AS ENUM (
  'owner',
  'admin',
  'manager',
  'member',
  'guest'
);

-- Create workspace members table
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{
    "projects": {"create": false, "read": true, "update": false, "delete": false},
    "tasks": {"create": true, "read": true, "update": true, "delete": false},
    "calendar": {"create": true, "read": true, "update": true, "delete": false},
    "timeline": {"read": true},
    "users": {"invite": false, "manage": false},
    "workspace": {"manage": false}
  }'::jsonb,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(workspace_id, user_id)
);

-- Create workspace invitations table
CREATE TABLE public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{
    "projects": {"create": false, "read": true, "update": false, "delete": false},
    "tasks": {"create": true, "read": true, "update": true, "delete": false},
    "calendar": {"create": true, "read": true, "update": true, "delete": false},
    "timeline": {"read": true},
    "users": {"invite": false, "manage": false},
    "workspace": {"manage": false}
  }'::jsonb,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(workspace_id, email)
);

-- 2. UPDATE EXISTING TABLES FOR WORKSPACE SUPPORT
-- =====================================================

-- Add workspace_id to projects
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);

-- Add workspace_id to tasks
ALTER TABLE public.tasks ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);

-- Add workspace_id to calendar_events (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
    EXECUTE 'ALTER TABLE public.calendar_events ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE';
    EXECUTE 'CREATE INDEX idx_calendar_events_workspace ON public.calendar_events(workspace_id)';
  END IF;
END
$$;

-- Add workspace_id to activity_logs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    EXECUTE 'ALTER TABLE public.activity_logs ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE';
    EXECUTE 'CREATE INDEX idx_activity_logs_workspace ON public.activity_logs(workspace_id)';
  END IF;
END
$$;

-- Add workspace_id to notifications
ALTER TABLE public.notifications ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_notifications_workspace ON public.notifications(workspace_id);

-- 3. RBAC FUNCTIONS
-- =====================================================

-- Function to check workspace permissions
CREATE OR REPLACE FUNCTION public.has_workspace_permission(
  p_user_id UUID,
  p_workspace_id UUID,
  p_resource TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  user_role public.workspace_role;
BEGIN
  -- Get user's role and permissions in the workspace
  SELECT role, permissions INTO user_role, user_permissions
  FROM public.workspace_members
  WHERE user_id = p_user_id AND workspace_id = p_workspace_id AND is_active = true;

  -- If user is not a member, return false
  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Owner has all permissions
  IF user_role = 'owner' THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN COALESCE((user_permissions -> p_resource ->> p_action)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get default permissions for a role
CREATE OR REPLACE FUNCTION public.get_default_permissions(p_role public.workspace_role)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'owner' THEN '{
      "projects": {"create": true, "read": true, "update": true, "delete": true},
      "tasks": {"create": true, "read": true, "update": true, "delete": true},
      "calendar": {"create": true, "read": true, "update": true, "delete": true},
      "timeline": {"read": true, "update": true},
      "users": {"invite": true, "manage": true},
      "workspace": {"manage": true}
    }'::jsonb
    WHEN 'admin' THEN '{
      "projects": {"create": true, "read": true, "update": true, "delete": true},
      "tasks": {"create": true, "read": true, "update": true, "delete": true},
      "calendar": {"create": true, "read": true, "update": true, "delete": true},
      "timeline": {"read": true, "update": true},
      "users": {"invite": true, "manage": true},
      "workspace": {"manage": false}
    }'::jsonb
    WHEN 'manager' THEN '{
      "projects": {"create": true, "read": true, "update": true, "delete": false},
      "tasks": {"create": true, "read": true, "update": true, "delete": true},
      "calendar": {"create": true, "read": true, "update": true, "delete": false},
      "timeline": {"read": true, "update": false},
      "users": {"invite": true, "manage": false},
      "workspace": {"manage": false}
    }'::jsonb
    WHEN 'member' THEN '{
      "projects": {"create": false, "read": true, "update": false, "delete": false},
      "tasks": {"create": true, "read": true, "update": true, "delete": false},
      "calendar": {"create": true, "read": true, "update": true, "delete": false},
      "timeline": {"read": true, "update": false},
      "users": {"invite": false, "manage": false},
      "workspace": {"manage": false}
    }'::jsonb
    WHEN 'guest' THEN '{
      "projects": {"create": false, "read": true, "update": false, "delete": false},
      "tasks": {"create": false, "read": true, "update": false, "delete": false},
      "calendar": {"create": false, "read": true, "update": false, "delete": false},
      "timeline": {"read": true, "update": false},
      "users": {"invite": false, "manage": false},
      "workspace": {"manage": false}
    }'::jsonb
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to create workspace
CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Validate owner_id
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner ID cannot be null';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, description, owner_id)
  VALUES (p_name, p_slug, p_description, p_owner_id)
  RETURNING id INTO new_workspace_id;

  -- Add owner as workspace member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
  VALUES (new_workspace_id, p_owner_id, 'owner', public.get_default_permissions('owner'));

  -- Log the creation for debugging
  RAISE NOTICE 'Created workspace % with ID % for user %', p_name, new_workspace_id, p_owner_id;

  RETURN new_workspace_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create workspace: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGERS AND AUTOMATIC FUNCTIONS
-- =====================================================

-- Auto-update workspace permissions when role changes
CREATE OR REPLACE FUNCTION handle_workspace_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role != NEW.role THEN
    NEW.permissions := public.get_default_permissions(NEW.role);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_role_change_trigger
  BEFORE UPDATE OF role ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION handle_workspace_role_change();

-- Auto-update updated_at timestamps
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX idx_workspaces_active ON public.workspaces(is_active) WHERE is_active = true;

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_active ON public.workspace_members(workspace_id, is_active) WHERE is_active = true;

CREATE INDEX idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_expires ON public.workspace_invitations(expires_at);

-- 6. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on workspace tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view workspace members for their workspaces"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create their own workspace membership"
  ON public.workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workspace admins can manage members"
  ON public.workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Workspace invitations policies
CREATE POLICY "Workspace members can view invitations"
  ON public.workspace_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authorized users can manage invitations"
  ON public.workspace_invitations FOR ALL
  USING (
    public.has_workspace_permission(auth.uid(), workspace_id, 'users', 'invite')
  );

-- Update existing table policies to include workspace filtering
-- Projects policies (workspace-aware)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Users can view projects in their workspaces"
  ON public.projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create projects with permission"
  ON public.projects FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(auth.uid(), workspace_id, 'projects', 'create')
  );

CREATE POLICY "Users can update projects with permission"
  ON public.projects FOR UPDATE
  USING (
    public.has_workspace_permission(auth.uid(), workspace_id, 'projects', 'update')
  );

CREATE POLICY "Users can delete projects with permission"
  ON public.projects FOR DELETE
  USING (
    public.has_workspace_permission(auth.uid(), workspace_id, 'projects', 'delete')
  );

-- Tasks policies (workspace-aware)
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can view tasks in their workspaces"
  ON public.tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can create tasks with permission"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.has_workspace_permission(auth.uid(), workspace_id, 'tasks', 'create')
  );

CREATE POLICY "Users can update tasks with permission"
  ON public.tasks FOR UPDATE
  USING (
    public.has_workspace_permission(auth.uid(), workspace_id, 'tasks', 'update') OR
    assignee_id = auth.uid() -- Users can always update their assigned tasks
  );

CREATE POLICY "Users can delete tasks with permission"
  ON public.tasks FOR DELETE
  USING (
    public.has_workspace_permission(auth.uid(), workspace_id, 'tasks', 'delete')
  );
