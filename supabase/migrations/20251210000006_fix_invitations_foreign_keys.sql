-- Fix workspace invitations foreign key relationships
-- =============================================================

-- First, ensure profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace policies for profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Drop existing workspace_invitations table if it has issues
DROP TABLE IF EXISTS workspace_invitations CASCADE;

-- Recreate workspace_invitations table with proper foreign keys
CREATE TABLE workspace_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'guest')),
  permissions JSONB DEFAULT '{
    "projects": {"create": false, "read": true, "update": false, "delete": false},
    "tasks": {"create": true, "read": true, "update": true, "delete": false},
    "calendar": {"create": true, "read": true, "update": true, "delete": false},
    "timeline": {"read": true},
    "users": {"invite": false, "manage": false},
    "workspace": {"manage": false}
  }'::jsonb,
  invited_by UUID NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Add proper foreign key constraints
  CONSTRAINT workspace_invitations_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT workspace_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE CASCADE,

  -- Unique constraint
  UNIQUE(workspace_id, email)
);

-- Enable RLS on workspace_invitations
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspace_invitations
CREATE POLICY "workspace_invitations_select_policy" ON workspace_invitations
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "workspace_invitations_insert_policy" ON workspace_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "workspace_invitations_update_policy" ON workspace_invitations
  FOR UPDATE USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "workspace_invitations_delete_policy" ON workspace_invitations
  FOR DELETE USING (
    invited_by = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Create function to auto-create profiles
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION ensure_user_profile();

-- Create profiles for existing users
INSERT INTO profiles (id, display_name, created_at, updated_at)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1),
    'User'
  ),
  NOW(),
  NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON workspace_invitations TO authenticated;
