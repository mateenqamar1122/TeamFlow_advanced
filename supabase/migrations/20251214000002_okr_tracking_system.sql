-- Goal & OKR Tracking System Migration
-- ============================================================================

-- 1. GOALS TABLE
-- ============================================================================

CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('company', 'team', 'individual')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  quarter TEXT, -- e.g., '2024-Q1'

  -- Progress
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'on_hold')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Assignments
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignees JSONB DEFAULT '[]'::jsonb, -- Array of user IDs

  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. KEY RESULTS TABLE
-- ============================================================================

CREATE TABLE public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Key Result details
  title TEXT NOT NULL,
  description TEXT,

  -- Measurement
  measurement_type TEXT NOT NULL CHECK (measurement_type IN ('percentage', 'number', 'currency', 'boolean')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit TEXT, -- e.g., 'users', 'revenue', '%'

  -- Timeline
  due_date DATE,

  -- Progress
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'at_risk', 'behind')),

  -- Assignment
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. GOAL UPDATES TABLE
-- ============================================================================

CREATE TABLE public.goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Update details
  update_type TEXT NOT NULL CHECK (update_type IN ('progress', 'status_change', 'comment', 'milestone')),
  content TEXT NOT NULL,

  -- Progress data
  previous_progress INTEGER,
  new_progress INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. INDEXES
-- ============================================================================

CREATE INDEX idx_goals_workspace_id ON public.goals(workspace_id);
CREATE INDEX idx_goals_owner_id ON public.goals(owner_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_quarter ON public.goals(quarter);
CREATE INDEX idx_goals_end_date ON public.goals(end_date);

CREATE INDEX idx_key_results_goal_id ON public.key_results(goal_id);
CREATE INDEX idx_key_results_workspace_id ON public.key_results(workspace_id);
CREATE INDEX idx_key_results_owner_id ON public.key_results(owner_id);
CREATE INDEX idx_key_results_due_date ON public.key_results(due_date);

CREATE INDEX idx_goal_updates_goal_id ON public.goal_updates(goal_id);
CREATE INDEX idx_goal_updates_workspace_id ON public.goal_updates(workspace_id);
CREATE INDEX idx_goal_updates_created_at ON public.goal_updates(created_at);

-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can view goals in their workspaces" ON public.goals
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can create goals in their workspaces" ON public.goals
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can update goals they own or have permission" ON public.goals
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Key Results policies
CREATE POLICY "Users can view key results in their workspaces" ON public.key_results
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can create key results in their workspaces" ON public.key_results
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can update key results they own" ON public.key_results
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Goal Updates policies
CREATE POLICY "Users can view goal updates in their workspaces" ON public.goal_updates
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can create goal updates in their workspaces" ON public.goal_updates
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- 6. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_key_results_updated_at
    BEFORE UPDATE ON public.key_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'OKR Tracking System created successfully!' as status;
