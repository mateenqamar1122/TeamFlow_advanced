-- Ensure workspace invitations table is properly set up for email invitations
-- =============================================================

-- Create or update workspace_invitations table
DO $$
BEGIN
  -- Check if table exists, create if not
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
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
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invitations' AND column_name = 'token') THEN
    ALTER TABLE public.workspace_invitations ADD COLUMN token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invitations' AND column_name = 'expires_at') THEN
    ALTER TABLE public.workspace_invitations ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_invitations' AND column_name = 'accepted_at') THEN
    ALTER TABLE public.workspace_invitations ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable RLS on workspace_invitations
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "workspace_invitations_policy" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their workspaces" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their workspaces" ON public.workspace_invitations;

-- Create RLS policies for workspace_invitations
CREATE POLICY "workspace_invitations_workspace_members"
  ON public.workspace_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "workspace_invitations_invite"
  ON public.workspace_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() AND
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "workspace_invitations_manage"
  ON public.workspace_invitations FOR DELETE
  USING (
    invited_by = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON public.workspace_invitations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
