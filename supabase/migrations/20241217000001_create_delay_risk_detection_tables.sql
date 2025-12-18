-- AI Delay-Risk Detection Tables
-- This migration creates tables for AI-powered delay and risk detection system

-- Task Risk Assessments table to store AI-generated risk assessments for tasks
CREATE TABLE IF NOT EXISTS task_risk_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    risk_score DECIMAL(3,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1), -- 0-1 scale
    delay_probability DECIMAL(3,2) NOT NULL CHECK (delay_probability >= 0 AND delay_probability <= 1),
    predicted_delay_days INTEGER DEFAULT 0,
    risk_factors JSONB DEFAULT '[]'::jsonb, -- Array of risk factor objects
    recommendations JSONB DEFAULT '{}'::jsonb, -- Recommendations object
    confidence_level DECIMAL(3,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 1),
    assessment_type VARCHAR(50) DEFAULT 'ai_generated', -- 'ai_generated', 'manual', 'hybrid'
    model_version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_task_risk_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_risk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Project Risk Analytics table for project-level risk insights
CREATE TABLE IF NOT EXISTS project_risk_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID,
    workspace_id UUID NOT NULL,
    overall_risk_score DECIMAL(3,2) NOT NULL CHECK (overall_risk_score >= 0 AND overall_risk_score <= 1),
    completion_probability DECIMAL(3,2) NOT NULL CHECK (completion_probability >= 0 AND completion_probability <= 1),
    predicted_completion_date TIMESTAMPTZ,
    critical_path_risks JSONB DEFAULT '[]'::jsonb,
    resource_bottlenecks JSONB DEFAULT '[]'::jsonb,
    timeline_risks JSONB DEFAULT '[]'::jsonb,
    mitigation_suggestions JSONB DEFAULT '[]'::jsonb,
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_project_risk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_risk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Risk Patterns table to store learned patterns from historical data
CREATE TABLE IF NOT EXISTS delay_risk_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL, -- 'task_type', 'user_behavior', 'timeline', 'dependency'
    pattern_data JSONB NOT NULL, -- The actual pattern characteristics
    frequency_score DECIMAL(3,2) NOT NULL CHECK (frequency_score >= 0 AND frequency_score <= 1),
    impact_score DECIMAL(3,2) NOT NULL CHECK (impact_score >= 0 AND impact_score <= 1),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    examples JSONB DEFAULT '[]'::jsonb, -- Examples of tasks that match this pattern
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_risk_patterns_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Risk Alerts table for real-time risk notifications
CREATE TABLE IF NOT EXISTS risk_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL,
    task_id UUID,
    project_id UUID,
    alert_type VARCHAR(50) NOT NULL, -- 'high_risk', 'delay_predicted', 'bottleneck_detected', 'deadline_risk'
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    alert_message TEXT NOT NULL,
    alert_data JSONB DEFAULT '{}'::jsonb, -- Additional alert context data
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_risk_alerts_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_risk_alerts_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_risk_alerts_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_risk_alerts_resolver FOREIGN KEY (resolved_by) REFERENCES profiles(id)
);

-- Risk Detection Settings table for workspace-specific AI configuration
CREATE TABLE IF NOT EXISTS risk_detection_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    sensitivity_level VARCHAR(20) DEFAULT 'medium' CHECK (sensitivity_level IN ('low', 'medium', 'high')),
    analysis_frequency VARCHAR(20) DEFAULT 'daily' CHECK (analysis_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    alert_thresholds JSONB DEFAULT '{
        "high_risk": 0.7,
        "delay_probability": 0.6,
        "critical_path_risk": 0.8
    }'::jsonb,
    notification_preferences JSONB DEFAULT '{
        "email_alerts": true,
        "in_app_alerts": true,
        "dashboard_alerts": true
    }'::jsonb,
    ai_model_preferences JSONB DEFAULT '{
        "model_version": "1.0",
        "learning_enabled": true,
        "auto_recommendations": true
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_risk_settings_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_task_risk_assessments_task_id ON task_risk_assessments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_risk_assessments_workspace_id ON task_risk_assessments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_risk_assessments_risk_score ON task_risk_assessments(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_task_risk_assessments_created_at ON task_risk_assessments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_risk_analytics_project_id ON project_risk_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risk_analytics_workspace_id ON project_risk_analytics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_risk_analytics_risk_score ON project_risk_analytics(overall_risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_delay_risk_patterns_workspace_id ON delay_risk_patterns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_delay_risk_patterns_type ON delay_risk_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_delay_risk_patterns_frequency ON delay_risk_patterns(frequency_score DESC);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_workspace_id ON risk_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_task_id ON risk_alerts(task_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_unresolved ON risk_alerts(workspace_id, is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON risk_alerts(severity_level, created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE task_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risk_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE delay_risk_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_detection_settings ENABLE ROW LEVEL SECURITY;

-- Task Risk Assessments Policies
CREATE POLICY "Users can view task risk assessments in their workspaces"
    ON task_risk_assessments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = task_risk_assessments.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage task risk assessments in their workspaces"
    ON task_risk_assessments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = task_risk_assessments.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'manager', 'member')
        )
    );

-- Project Risk Analytics Policies
CREATE POLICY "Users can view project risk analytics in their workspaces"
    ON project_risk_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = project_risk_analytics.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage project risk analytics in their workspaces"
    ON project_risk_analytics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = project_risk_analytics.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'manager', 'member')
        )
    );

-- Risk Patterns Policies
CREATE POLICY "Users can view risk patterns in their workspaces"
    ON delay_risk_patterns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = delay_risk_patterns.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage risk patterns in their workspaces"
    ON delay_risk_patterns FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = delay_risk_patterns.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'manager')
        )
    );

-- Risk Alerts Policies
CREATE POLICY "Users can view risk alerts in their workspaces"
    ON risk_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = risk_alerts.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage risk alerts in their workspaces"
    ON risk_alerts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = risk_alerts.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'manager', 'member')
        )
    );

-- Risk Detection Settings Policies
CREATE POLICY "Users can view risk settings in their workspaces"
    ON risk_detection_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = risk_detection_settings.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage risk settings in their workspaces"
    ON risk_detection_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = risk_detection_settings.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'manager')
        )
    );

-- Function to automatically create default risk detection settings for new workspaces
CREATE OR REPLACE FUNCTION create_default_risk_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO risk_detection_settings (workspace_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default settings when a workspace is created
CREATE TRIGGER trigger_create_default_risk_settings
    AFTER INSERT ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION create_default_risk_settings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER trigger_update_task_risk_assessments_updated_at
    BEFORE UPDATE ON task_risk_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_project_risk_analytics_updated_at
    BEFORE UPDATE ON project_risk_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_delay_risk_patterns_updated_at
    BEFORE UPDATE ON delay_risk_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_risk_detection_settings_updated_at
    BEFORE UPDATE ON risk_detection_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
