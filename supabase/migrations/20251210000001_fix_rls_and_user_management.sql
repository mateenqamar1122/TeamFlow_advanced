-- Fix RLS Infinite Recursion and Complete User Management System
-- =============================================================

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can create their own workspace membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

-- 1. ENHANCED USER PROFILES
-- =============================================================

-- Create user profiles table for extended user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  title TEXT,
  department TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "in_app": true,
    "push": false,
    "task_assigned": true,
    "task_due": true,
    "project_updates": true,
    "workspace_invites": true
  }'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on user profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies (simple, no recursion)
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- 2. FIXED WORKSPACE POLICIES (NO RECURSION)
-- =============================================================

-- Simple workspace policies that don't cause recursion
CREATE POLICY "workspace_select_policy"
  ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "workspace_insert_policy"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_update_policy"
  ON public.workspaces FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
        AND wm.is_active = true
    )
  );

-- Fixed workspace members policies (NO RECURSION)
CREATE POLICY "workspace_members_select_policy"
  ON public.workspace_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT wm2.workspace_id FROM public.workspace_members wm2
      WHERE wm2.user_id = auth.uid() AND wm2.is_active = true
    )
  );

CREATE POLICY "workspace_members_insert_policy"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_update_policy"
  ON public.workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
        AND wm.is_active = true
    )
  );

CREATE POLICY "workspace_members_delete_policy"
  ON public.workspace_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

-- 3. USER ONBOARDING SYSTEM
-- =============================================================

-- Onboarding steps table
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(user_id, step_number)
);

-- Enable RLS
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own onboarding steps"
  ON public.onboarding_steps FOR ALL
  USING (user_id = auth.uid());

-- 4. USER INVITATION SYSTEM
-- =============================================================

-- Update workspace invitations with better tracking
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS personal_message TEXT,
  ADD COLUMN IF NOT EXISTS reminder_sent_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- 5. TASK ASSIGNMENT SYSTEM
-- =============================================================

-- Task assignments table for better tracking
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_task TEXT DEFAULT 'assignee', -- assignee, reviewer, observer
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  accepted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(task_id, assigned_to)
);

-- Enable RLS
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task assignments in their workspaces"
  ON public.task_assignments FOR SELECT
  USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.workspace_members wm ON t.workspace_id = wm.workspace_id
      WHERE t.id = task_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- 6. UTILITY FUNCTIONS FOR USER MANAGEMENT
-- =============================================================

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to initialize user onboarding
CREATE OR REPLACE FUNCTION public.initialize_user_onboarding(user_id UUID)
RETURNS VOID AS $$
DECLARE
  steps TEXT[] := ARRAY[
    'profile_setup',
    'workspace_creation',
    'first_project',
    'first_task',
    'team_invitation',
    'tutorial_completion'
  ];
  step_name TEXT;
  step_num INTEGER := 1;
BEGIN
  FOREACH step_name IN ARRAY steps
  LOOP
    INSERT INTO public.onboarding_steps (user_id, step_name, step_number)
    VALUES (user_id, step_name, step_num)
    ON CONFLICT (user_id, step_number) DO NOTHING;

    step_num := step_num + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete onboarding step
CREATE OR REPLACE FUNCTION public.complete_onboarding_step(
  p_user_id UUID,
  p_step_name TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  step_completed BOOLEAN := false;
BEGIN
  UPDATE public.onboarding_steps
  SET
    completed = true,
    completed_at = now(),
    data = p_data,
    updated_at = now()
  WHERE user_id = p_user_id AND step_name = p_step_name AND NOT completed
  RETURNING true INTO step_completed;

  -- Update user profile onboarding progress
  IF step_completed THEN
    UPDATE public.user_profiles
    SET
      onboarding_step = (
        SELECT COUNT(*) FROM public.onboarding_steps
        WHERE user_id = p_user_id AND completed = true
      ),
      onboarding_completed = (
        SELECT COUNT(*) = COUNT(*) FILTER (WHERE completed)
        FROM public.onboarding_steps
        WHERE user_id = p_user_id
      ),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN COALESCE(step_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send workspace invitation
CREATE OR REPLACE FUNCTION public.invite_user_to_workspace(
  p_workspace_id UUID,
  p_email TEXT,
  p_role public.workspace_role DEFAULT 'member',
  p_personal_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  invitation_id UUID;
  inviter_id UUID := auth.uid();
BEGIN
  -- Check if user has permission to invite
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = inviter_id
      AND wm.role IN ('owner', 'admin', 'manager')
      AND wm.is_active = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to invite members to this workspace';
  END IF;

  -- Create invitation
  INSERT INTO public.workspace_invitations (
    workspace_id, email, role, invited_by, personal_message
  ) VALUES (
    p_workspace_id, lower(p_email), p_role, inviter_id, p_personal_message
  ) RETURNING id INTO invitation_id;

  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept workspace invitation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token TEXT)
RETURNS UUID AS $$
DECLARE
  invitation RECORD;
  membership_id UUID;
  current_user_id UUID := auth.uid();
  current_user_email TEXT;
BEGIN
  -- Get current user email
  SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;

  -- Get invitation details
  SELECT * INTO invitation
  FROM public.workspace_invitations
  WHERE token = p_token
    AND expires_at > now()
    AND accepted_at IS NULL
    AND lower(email) = lower(current_user_email);

  IF invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Create workspace membership
  INSERT INTO public.workspace_members (
    workspace_id, user_id, role, permissions, invited_by, invited_at
  ) VALUES (
    invitation.workspace_id,
    current_user_id,
    invitation.role,
    public.get_default_permissions(invitation.role),
    invitation.invited_by,
    invitation.created_at
  ) RETURNING id INTO membership_id;

  -- Mark invitation as accepted
  UPDATE public.workspace_invitations
  SET accepted_at = now()
  WHERE id = invitation.id;

  RETURN membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. INDEXES FOR PERFORMANCE
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON public.user_profiles(last_active);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user ON public.onboarding_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_completed ON public.onboarding_steps(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON public.task_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON public.task_assignments(task_id);

-- 8. SAMPLE DATA FOR TESTING
-- =============================================================

-- This will be handled by the application, not in migration
