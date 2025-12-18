-- Portfolio/Program Dashboard and Custom Fields System
-- ============================================================================

-- 1. PORTFOLIOS TABLE (Program/Portfolio Management)
-- ============================================================================

CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  code TEXT, -- Portfolio code/identifier

  -- Management
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Financial
  budget DECIMAL(15,2),
  actual_cost DECIMAL(15,2) DEFAULT 0,

  -- Timeline
  start_date DATE,
  end_date DATE,

  -- Progress
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  health_status TEXT DEFAULT 'on_track' CHECK (health_status IN ('on_track', 'at_risk', 'behind', 'blocked')),

  -- Metadata
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. PORTFOLIO PROJECTS (Many-to-Many relationship)
-- ============================================================================

CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Relationship metadata
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority_in_portfolio INTEGER DEFAULT 1,
  contribution_weight DECIMAL(5,2) DEFAULT 100.00, -- How much this project contributes to portfolio progress

  -- Timestamps
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint
  UNIQUE(portfolio_id, project_id)
);

-- 3. CUSTOM FIELDS DEFINITION
-- ============================================================================

CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Field Definition
  name TEXT NOT NULL,
  field_key TEXT NOT NULL, -- Unique key for API/code usage
  description TEXT,

  -- Field Type & Configuration
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'email', 'url', 'textarea', 'currency', 'percentage')),
  is_required BOOLEAN DEFAULT false,

  -- Configuration for different field types
  field_config JSONB DEFAULT '{}'::jsonb, -- Store select options, validation rules, etc.

  -- Applicable Entities
  applies_to TEXT[] NOT NULL, -- Array like ['projects', 'tasks', 'portfolios']

  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint for field key within workspace
  UNIQUE(workspace_id, field_key)
);

-- 4. CUSTOM FIELD VALUES (Generic storage for all entities)
-- ============================================================================

CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,

  -- Entity reference (polymorphic)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'portfolio', 'goal')),
  entity_id UUID NOT NULL,

  -- Value storage (polymorphic)
  text_value TEXT,
  number_value DECIMAL(15,4),
  boolean_value BOOLEAN,
  date_value DATE,
  json_value JSONB, -- For complex values like arrays, objects

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint: one value per field per entity
  UNIQUE(custom_field_id, entity_type, entity_id)
);

-- 5. PORTFOLIO METRICS (Pre-calculated for performance)
-- ============================================================================

CREATE TABLE public.portfolio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Calculated Metrics
  total_projects INTEGER DEFAULT 0,
  active_projects INTEGER DEFAULT 0,
  completed_projects INTEGER DEFAULT 0,
  on_hold_projects INTEGER DEFAULT 0,

  -- Financial Metrics
  total_budget DECIMAL(15,2) DEFAULT 0,
  spent_budget DECIMAL(15,2) DEFAULT 0,
  remaining_budget DECIMAL(15,2) DEFAULT 0,
  budget_variance_percentage DECIMAL(5,2) DEFAULT 0,

  -- Timeline Metrics
  projects_on_time INTEGER DEFAULT 0,
  projects_at_risk INTEGER DEFAULT 0,
  projects_behind INTEGER DEFAULT 0,

  -- Resource Metrics
  total_team_members INTEGER DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,

  -- Last calculation
  calculated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique constraint
  UNIQUE(portfolio_id)
);

-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Portfolios indexes
CREATE INDEX idx_portfolios_workspace_id ON public.portfolios(workspace_id);
CREATE INDEX idx_portfolios_manager_id ON public.portfolios(manager_id);
CREATE INDEX idx_portfolios_status ON public.portfolios(status);
CREATE INDEX idx_portfolios_health_status ON public.portfolios(health_status);

-- Portfolio projects indexes
CREATE INDEX idx_portfolio_projects_portfolio_id ON public.portfolio_projects(portfolio_id);
CREATE INDEX idx_portfolio_projects_project_id ON public.portfolio_projects(project_id);
CREATE INDEX idx_portfolio_projects_workspace_id ON public.portfolio_projects(workspace_id);

-- Custom fields indexes
CREATE INDEX idx_custom_fields_workspace_id ON public.custom_fields(workspace_id);
CREATE INDEX idx_custom_fields_field_key ON public.custom_fields(field_key);
CREATE INDEX idx_custom_fields_applies_to ON public.custom_fields USING GIN(applies_to);

-- Custom field values indexes
CREATE INDEX idx_custom_field_values_workspace_id ON public.custom_field_values(workspace_id);
CREATE INDEX idx_custom_field_values_custom_field_id ON public.custom_field_values(custom_field_id);
CREATE INDEX idx_custom_field_values_entity ON public.custom_field_values(entity_type, entity_id);

-- Portfolio metrics indexes
CREATE INDEX idx_portfolio_metrics_portfolio_id ON public.portfolio_metrics(portfolio_id);
CREATE INDEX idx_portfolio_metrics_workspace_id ON public.portfolio_metrics(workspace_id);

-- 7. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_metrics ENABLE ROW LEVEL SECURITY;

-- Portfolios policies
CREATE POLICY "Users can view portfolios in their workspaces" ON public.portfolios
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Users can create portfolios in their workspaces" ON public.portfolios
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can update portfolios in their workspaces" ON public.portfolios
  FOR UPDATE USING (
    manager_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Portfolio projects policies
CREATE POLICY "Users can view portfolio projects in their workspaces" ON public.portfolio_projects
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Users can manage portfolio projects in their workspaces" ON public.portfolio_projects
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Custom fields policies
CREATE POLICY "Users can view custom fields in their workspaces" ON public.custom_fields
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Admins can manage custom fields" ON public.custom_fields
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true AND wm.role IN ('owner', 'admin')
    )
  );

-- Custom field values policies
CREATE POLICY "Users can view custom field values in their workspaces" ON public.custom_field_values
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

CREATE POLICY "Users can manage custom field values in their workspaces" ON public.custom_field_values
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

-- Portfolio metrics policies (read-only for most users)
CREATE POLICY "Users can view portfolio metrics in their workspaces" ON public.portfolio_metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.is_active = true
    )
  );

-- 8. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. PORTFOLIO METRICS CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_portfolio_metrics(portfolio_uuid UUID)
RETURNS VOID AS $$
DECLARE
  portfolio_workspace_id UUID;
  total_projects_count INTEGER;
  active_projects_count INTEGER;
  completed_projects_count INTEGER;
  on_hold_projects_count INTEGER;
  total_budget_sum DECIMAL(15,2);
  spent_budget_sum DECIMAL(15,2);
BEGIN
  -- Get workspace ID
  SELECT workspace_id INTO portfolio_workspace_id
  FROM portfolios WHERE id = portfolio_uuid;

  -- Calculate project counts
  SELECT COUNT(*) INTO total_projects_count
  FROM portfolio_projects pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.portfolio_id = portfolio_uuid;

  SELECT COUNT(*) INTO active_projects_count
  FROM portfolio_projects pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.portfolio_id = portfolio_uuid AND p.status = 'active';

  SELECT COUNT(*) INTO completed_projects_count
  FROM portfolio_projects pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.portfolio_id = portfolio_uuid AND p.status = 'completed';

  SELECT COUNT(*) INTO on_hold_projects_count
  FROM portfolio_projects pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.portfolio_id = portfolio_uuid AND p.status = 'on-hold';

  -- Calculate budget metrics
  SELECT COALESCE(SUM(p.budget), 0) INTO total_budget_sum
  FROM portfolio_projects pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.portfolio_id = portfolio_uuid;

  SELECT COALESCE(SUM(p.actual_cost), 0) INTO spent_budget_sum
  FROM portfolio_projects pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.portfolio_id = portfolio_uuid;

  -- Upsert metrics
  INSERT INTO portfolio_metrics (
    portfolio_id, workspace_id, total_projects, active_projects,
    completed_projects, on_hold_projects, total_budget, spent_budget,
    remaining_budget, calculated_at
  ) VALUES (
    portfolio_uuid, portfolio_workspace_id, total_projects_count, active_projects_count,
    completed_projects_count, on_hold_projects_count, total_budget_sum, spent_budget_sum,
    total_budget_sum - spent_budget_sum, NOW()
  )
  ON CONFLICT (portfolio_id) DO UPDATE SET
    total_projects = EXCLUDED.total_projects,
    active_projects = EXCLUDED.active_projects,
    completed_projects = EXCLUDED.completed_projects,
    on_hold_projects = EXCLUDED.on_hold_projects,
    total_budget = EXCLUDED.total_budget,
    spent_budget = EXCLUDED.spent_budget,
    remaining_budget = EXCLUDED.remaining_budget,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Portfolio Dashboard and Custom Fields system created successfully!' as status;
