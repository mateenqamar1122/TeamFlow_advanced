-- Workload Heatmap and Department/Team Management Tools
-- ============================================================================

-- 1. DEPARTMENTS TABLE
-- ============================================================================

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  code TEXT, -- Department code/abbreviation
  color TEXT DEFAULT '#3b82f6', -- Hex color for visual identification

  -- Hierarchy
  parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  department_level INTEGER DEFAULT 1, -- Organizational level (1 = top level)

  -- Management
  head_of_department_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deputy_head_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Configuration
  budget DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint for department names within workspace
  UNIQUE(workspace_id, name)
);

-- 2. TEAMS TABLE (Sub-units within departments)
-- ============================================================================

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  name TEXT NOT NULL,
  description TEXT,
  team_type TEXT DEFAULT 'functional' CHECK (team_type IN ('functional', 'project', 'cross_functional', 'temporary')),

  -- Management
  team_lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scrum_master_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Configuration
  max_members INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint for team names within department
  UNIQUE(department_id, name)
);

-- 3. TEAM MEMBERSHIPS (Many-to-Many: Users can be in multiple teams)
-- ============================================================================

CREATE TABLE public.team_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Role within team
  team_role TEXT DEFAULT 'member' CHECK (team_role IN ('lead', 'senior', 'member', 'intern', 'contractor')),

  -- Assignment details
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignment_percentage DECIMAL(5,2) DEFAULT 100.00, -- % allocation to this team

  -- Status
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  left_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint: user can only have one active membership per team
  UNIQUE(team_id, user_id, is_active)
);

-- 4. WORKLOAD TRACKING TABLE
-- ============================================================================

CREATE TABLE public.workload_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period
  date DATE NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week
  month_start DATE NOT NULL, -- First day of the month
  quarter_start DATE NOT NULL, -- First day of the quarter

  -- Workload data
  planned_hours DECIMAL(5,2) DEFAULT 8.00,
  actual_hours DECIMAL(5,2) DEFAULT 0.00,
  overtime_hours DECIMAL(5,2) DEFAULT 0.00,

  -- Task/Project breakdown
  project_hours JSONB DEFAULT '{}'::jsonb, -- {project_id: hours}
  task_hours JSONB DEFAULT '{}'::jsonb, -- {task_id: hours}

  -- Capacity and utilization
  availability_percentage DECIMAL(5,2) DEFAULT 100.00, -- Available capacity for the day
  utilization_percentage DECIMAL(5,2) DEFAULT 0.00, -- Actual utilization

  -- Status and notes
  status TEXT DEFAULT 'normal' CHECK (status IN ('underloaded', 'normal', 'busy', 'overloaded', 'unavailable')),
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint: one entry per user per day
  UNIQUE(workspace_id, user_id, date)
);

-- 5. WORKLOAD HEATMAP AGGREGATIONS (For performance)
-- ============================================================================

CREATE TABLE public.workload_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Aggregation scope
  aggregation_type TEXT NOT NULL CHECK (aggregation_type IN ('user_daily', 'user_weekly', 'user_monthly', 'team_daily', 'team_weekly', 'department_daily', 'department_weekly')),
  entity_id UUID NOT NULL, -- user_id, team_id, or department_id
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Aggregated metrics
  total_planned_hours DECIMAL(8,2) DEFAULT 0.00,
  total_actual_hours DECIMAL(8,2) DEFAULT 0.00,
  total_overtime_hours DECIMAL(8,2) DEFAULT 0.00,
  avg_utilization DECIMAL(5,2) DEFAULT 0.00,
  max_utilization DECIMAL(5,2) DEFAULT 0.00,
  overload_days INTEGER DEFAULT 0,
  underload_days INTEGER DEFAULT 0,

  -- Status distribution
  status_breakdown JSONB DEFAULT '{}'::jsonb, -- Count of days by status

  -- Calculated at
  calculated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint
  UNIQUE(workspace_id, aggregation_type, entity_id, period_start)
);

-- 6. SKILL MATRIX (For team management and workload distribution)
-- ============================================================================

CREATE TABLE public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Skill information
  skill_name TEXT NOT NULL,
  skill_category TEXT DEFAULT 'technical', -- technical, soft, domain, language, etc.
  proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level >= 1 AND proficiency_level <= 5), -- 1=Beginner, 5=Expert

  -- Verification
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_date TIMESTAMPTZ,

  -- Experience
  years_experience DECIMAL(3,1) DEFAULT 0.0,
  last_used DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint
  UNIQUE(workspace_id, user_id, skill_name)
);

-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Departments indexes
CREATE INDEX idx_departments_workspace_id ON public.departments(workspace_id);
CREATE INDEX idx_departments_parent_id ON public.departments(parent_department_id);
CREATE INDEX idx_departments_head_id ON public.departments(head_of_department_id);

-- Teams indexes
CREATE INDEX idx_teams_workspace_id ON public.teams(workspace_id);
CREATE INDEX idx_teams_department_id ON public.teams(department_id);
CREATE INDEX idx_teams_lead_id ON public.teams(team_lead_id);

-- Team memberships indexes
CREATE INDEX idx_team_memberships_team_id ON public.team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON public.team_memberships(user_id);
CREATE INDEX idx_team_memberships_workspace_id ON public.team_memberships(workspace_id);
CREATE INDEX idx_team_memberships_active ON public.team_memberships(is_active) WHERE is_active = true;

-- Workload entries indexes
CREATE INDEX idx_workload_entries_workspace_id ON public.workload_entries(workspace_id);
CREATE INDEX idx_workload_entries_user_id ON public.workload_entries(user_id);
CREATE INDEX idx_workload_entries_date ON public.workload_entries(date);
CREATE INDEX idx_workload_entries_week_start ON public.workload_entries(week_start);
CREATE INDEX idx_workload_entries_month_start ON public.workload_entries(month_start);
CREATE INDEX idx_workload_entries_status ON public.workload_entries(status);

-- Workload aggregations indexes
CREATE INDEX idx_workload_aggregations_workspace_id ON public.workload_aggregations(workspace_id);
CREATE INDEX idx_workload_aggregations_type_entity ON public.workload_aggregations(aggregation_type, entity_id);
CREATE INDEX idx_workload_aggregations_period ON public.workload_aggregations(period_start, period_end);

-- User skills indexes
CREATE INDEX idx_user_skills_workspace_id ON public.user_skills(workspace_id);
CREATE INDEX idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX idx_user_skills_category ON public.user_skills(skill_category);
CREATE INDEX idx_user_skills_proficiency ON public.user_skills(proficiency_level);

-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Users can view departments in their workspaces" ON public.departments
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Admins can manage departments" ON public.departments
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Teams policies
CREATE POLICY "Users can view teams in their workspaces" ON public.teams
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Team leads and admins can manage teams" ON public.teams
  FOR ALL USING (
    team_lead_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Team memberships policies
CREATE POLICY "Users can view team memberships in their workspaces" ON public.team_memberships
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Team leads and admins can manage memberships" ON public.team_memberships
  FOR ALL USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT t.id FROM teams t WHERE t.team_lead_id = auth.uid()
    ) OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Workload entries policies
CREATE POLICY "Users can view workload in their workspaces" ON public.workload_entries
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Users can manage their own workload" ON public.workload_entries
  FOR ALL USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Workload aggregations policies
CREATE POLICY "Users can view aggregations in their workspaces" ON public.workload_aggregations
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

-- User skills policies
CREATE POLICY "Users can view skills in their workspaces" ON public.user_skills
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Users can manage their own skills" ON public.user_skills
  FOR ALL USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- 9. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_memberships_updated_at
  BEFORE UPDATE ON public.team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workload_entries_updated_at
  BEFORE UPDATE ON public.workload_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON public.user_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. WORKLOAD CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate workload aggregations
CREATE OR REPLACE FUNCTION calculate_workload_aggregations(
  workspace_uuid UUID,
  start_date DATE,
  end_date DATE
) RETURNS VOID AS $$
BEGIN
  -- Delete existing aggregations for the period
  DELETE FROM workload_aggregations
  WHERE workspace_id = workspace_uuid
    AND period_start >= start_date
    AND period_end <= end_date;

  -- Calculate user daily aggregations
  INSERT INTO workload_aggregations (
    workspace_id, aggregation_type, entity_id, period_start, period_end,
    total_planned_hours, total_actual_hours, total_overtime_hours,
    avg_utilization, max_utilization, overload_days, underload_days
  )
  SELECT
    workspace_id,
    'user_daily'::TEXT,
    user_id,
    date,
    date,
    planned_hours,
    actual_hours,
    overtime_hours,
    utilization_percentage,
    utilization_percentage,
    CASE WHEN status = 'overloaded' THEN 1 ELSE 0 END,
    CASE WHEN status = 'underloaded' THEN 1 ELSE 0 END
  FROM workload_entries
  WHERE workspace_id = workspace_uuid
    AND date BETWEEN start_date AND end_date;

  -- Calculate user weekly aggregations
  INSERT INTO workload_aggregations (
    workspace_id, aggregation_type, entity_id, period_start, period_end,
    total_planned_hours, total_actual_hours, total_overtime_hours,
    avg_utilization, max_utilization, overload_days, underload_days
  )
  SELECT
    workspace_id,
    'user_weekly'::TEXT,
    user_id,
    week_start,
    week_start + INTERVAL '6 days',
    SUM(planned_hours),
    SUM(actual_hours),
    SUM(overtime_hours),
    AVG(utilization_percentage),
    MAX(utilization_percentage),
    COUNT(CASE WHEN status = 'overloaded' THEN 1 END),
    COUNT(CASE WHEN status = 'underloaded' THEN 1 END)
  FROM workload_entries
  WHERE workspace_id = workspace_uuid
    AND date BETWEEN start_date AND end_date
  GROUP BY workspace_id, user_id, week_start;

END;
$$ LANGUAGE plpgsql;

-- Function to get team workload summary
CREATE OR REPLACE FUNCTION get_team_workload_summary(
  team_uuid UUID,
  target_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_members INTEGER,
  avg_utilization DECIMAL(5,2),
  overloaded_members INTEGER,
  underloaded_members INTEGER,
  total_planned_hours DECIMAL(8,2),
  total_actual_hours DECIMAL(8,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    COUNT(tm.user_id)::INTEGER,
    AVG(we.utilization_percentage),
    COUNT(CASE WHEN we.status = 'overloaded' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN we.status = 'underloaded' THEN 1 END)::INTEGER,
    SUM(we.planned_hours),
    SUM(we.actual_hours)
  FROM teams t
  JOIN team_memberships tm ON t.id = tm.team_id AND tm.is_active = true
  LEFT JOIN workload_entries we ON tm.user_id = we.user_id AND we.date = target_date
  WHERE t.id = team_uuid
  GROUP BY t.id, t.name;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Workload Heatmap and Department/Team Management system created successfully!' as status;
