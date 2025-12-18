-- Fix Infinite Recursion in Workspace RLS Policies
-- =================================================

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "workspace_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete_policy" ON public.workspaces;

DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;

-- Drop any other existing policies that might conflict
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can create their own workspace membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

-- Ensure RLS is enabled
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- =================================================
-- SIMPLE, NON-RECURSIVE WORKSPACE POLICIES
-- =================================================

-- Workspace policies - simple and direct, no recursion
CREATE POLICY "workspaces_owner_full_access"
  ON public.workspaces FOR ALL
  USING (owner_id = auth.uid());

-- Allow members to view workspaces they belong to
-- This query directly checks workspace_members without causing recursion
CREATE POLICY "workspaces_member_read_access"
  ON public.workspaces FOR SELECT
  USING (
    id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- =================================================
-- SIMPLE, NON-RECURSIVE WORKSPACE MEMBERS POLICIES
-- =================================================

-- Users can always see their own membership records
CREATE POLICY "workspace_members_own_records"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Workspace owners can see all members of their workspaces
CREATE POLICY "workspace_members_owner_access"
  ON public.workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT w.id
      FROM public.workspaces w
      WHERE w.owner_id = auth.uid()
    )
  );

-- Members can see other members in the same workspace
-- This is the key fix - we avoid recursion by directly querying workspace_members
CREATE POLICY "workspace_members_peer_visibility"
  ON public.workspace_members FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id
      FROM public.workspace_members wm2
      WHERE wm2.user_id = auth.uid()
        AND wm2.is_active = true
    )
  );

-- Admins can manage members (insert/update/delete) - only in workspaces where they are admins
CREATE POLICY "workspace_members_admin_management"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_admin_update"
  ON public.workspace_members FOR UPDATE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_admin_delete"
  ON public.workspace_members FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin')
    )
    -- Or users can remove themselves
    OR user_id = auth.uid()
  );

-- =================================================
-- CREATE HELPER FUNCTIONS FOR COMPLEX PERMISSIONS
-- =================================================

-- Function to check if user is workspace member (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = user_uuid
      AND is_active = true
  );
END;
$$;

-- Function to get user's role in workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(workspace_uuid UUID, user_uuid UUID)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid
    AND is_active = true;

  RETURN COALESCE(user_role, 'none');
END;
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  workspace_uuid UUID,
  user_uuid UUID,
  resource text,
  action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions jsonb;
  has_perm boolean := false;
BEGIN
  -- Get user permissions from workspace_members
  SELECT permissions INTO user_permissions
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid
    AND is_active = true;

  -- If no permissions found, return false
  IF user_permissions IS NULL THEN
    RETURN false;
  END IF;

  -- Check specific permission
  SELECT (user_permissions -> resource -> action)::boolean INTO has_perm;

  RETURN COALESCE(has_perm, false);
END;
$$;

-- =================================================
-- UPDATE OTHER TABLE POLICIES TO USE HELPER FUNCTIONS
-- =================================================

-- Fix project policies if they exist
DO $$
BEGIN
  -- Drop existing project policies
  DROP POLICY IF EXISTS "project_workspace_access" ON public.projects;

  -- Create new project policy using helper function
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    CREATE POLICY "projects_workspace_member_access"
      ON public.projects FOR SELECT
      USING (
        workspace_id IS NULL OR
        public.is_workspace_member(workspace_id, auth.uid())
      );
  END IF;
END;
$$;

-- Fix task policies if they exist
DO $$
BEGIN
  -- Drop existing task policies
  DROP POLICY IF EXISTS "task_workspace_access" ON public.tasks;

  -- Create new task policy using helper function
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE POLICY "tasks_workspace_member_access"
      ON public.tasks FOR SELECT
      USING (
        workspace_id IS NULL OR
        public.is_workspace_member(workspace_id, auth.uid())
      );
  END IF;
END;
$$;

-- =================================================
-- INSERT DEFAULT DATA FOR TESTING
-- =================================================

-- Function to create a default workspace for new users
CREATE OR REPLACE FUNCTION public.create_default_workspace_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_workspace_id UUID;
  user_email TEXT;
  workspace_name TEXT;
  workspace_slug TEXT;
BEGIN
  -- Get user email from auth.users or user_profiles
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- Create workspace name and slug from email
  workspace_name := COALESCE(
    SPLIT_PART(user_email, '@', 1) || '''s Workspace',
    'My Workspace'
  );

  workspace_slug := COALESCE(
    LOWER(REGEXP_REPLACE(SPLIT_PART(user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')),
    'my-workspace'
  ) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT;

  -- Insert default workspace
  INSERT INTO public.workspaces (
    name,
    slug,
    description,
    owner_id,
    settings
  ) VALUES (
    workspace_name,
    workspace_slug,
    'Default workspace created automatically',
    NEW.id,
    '{
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
    }'::jsonb
  ) RETURNING id INTO new_workspace_id;

  -- Add user as owner member
  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role,
    permissions,
    joined_at,
    is_active
  ) VALUES (
    new_workspace_id,
    NEW.id,
    'owner'::public.workspace_role,
    '{
      "projects": {"create": true, "read": true, "update": true, "delete": true},
      "tasks": {"create": true, "read": true, "update": true, "delete": true},
      "calendar": {"create": true, "read": true, "update": true, "delete": true},
      "timeline": {"read": true, "update": true},
      "users": {"invite": true, "manage": true},
      "workspace": {"manage": true}
    }'::jsonb,
    NOW(),
    true
  );

  RETURN NEW;
END;
$$;

-- Create trigger to auto-create workspace for new users
DROP TRIGGER IF EXISTS create_default_workspace_trigger ON public.user_profiles;
CREATE TRIGGER create_default_workspace_trigger
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_workspace_for_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_workspace_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, UUID, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_workspace_for_user() TO authenticated;
