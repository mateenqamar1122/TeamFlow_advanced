-- AI Management Assistant Migration
-- This migration creates tables and policies for AI-powered management insights

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create AI management insights table
CREATE TABLE IF NOT EXISTS public.ai_management_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('project_health', 'team_performance', 'risk_analysis', 'workload_forecast', 'productivity_trends')),
    title TEXT NOT NULL,
    description TEXT,
    insights JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI conversation history table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_type VARCHAR(50) NOT NULL CHECK (conversation_type IN ('general', 'project_analysis', 'team_insights', 'risk_assessment')),
    messages JSONB NOT NULL DEFAULT '[]',
    context JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI prompts and templates table
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    variables JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI analysis results table
CREATE TABLE IF NOT EXISTS public.ai_analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    results JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    model_version VARCHAR(50),
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_management_insights_workspace_id ON public.ai_management_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_management_insights_type ON public.ai_management_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_management_insights_priority ON public.ai_management_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_management_insights_status ON public.ai_management_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_management_insights_generated_at ON public.ai_management_insights(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_workspace_id ON public.ai_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_type ON public.ai_conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_active ON public.ai_conversations(is_active);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_workspace_id ON public.ai_prompt_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_templates_category ON public.ai_prompt_templates(category);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_workspace_id ON public.ai_analysis_results(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_entity ON public.ai_analysis_results(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_results_type ON public.ai_analysis_results(analysis_type);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_ai_management_insights_updated_at ON public.ai_management_insights;
CREATE TRIGGER update_ai_management_insights_updated_at
    BEFORE UPDATE ON public.ai_management_insights
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_prompt_templates_updated_at ON public.ai_prompt_templates;
CREATE TRIGGER update_ai_prompt_templates_updated_at
    BEFORE UPDATE ON public.ai_prompt_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security Policies

-- AI Management Insights policies
ALTER TABLE public.ai_management_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights in their workspaces"
ON public.ai_management_insights FOR SELECT
USING (
    workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can insert insights in their workspaces"
ON public.ai_management_insights FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can update insights in their workspaces"
ON public.ai_management_insights FOR UPDATE
USING (
    workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can delete insights in their workspaces"
ON public.ai_management_insights FOR DELETE
USING (
    workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

-- AI Conversations policies
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
ON public.ai_conversations FOR SELECT
USING (
    user_id = auth.uid()
    AND workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can insert their own conversations"
ON public.ai_conversations FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can update their own conversations"
ON public.ai_conversations FOR UPDATE
USING (
    user_id = auth.uid()
    AND workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can delete their own conversations"
ON public.ai_conversations FOR DELETE
USING (
    user_id = auth.uid()
    AND workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

-- AI Prompt Templates policies
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prompt templates"
ON public.ai_prompt_templates FOR SELECT
USING (
    is_system = true
    OR workspace_id IS NULL
    OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can insert prompt templates in their workspaces"
ON public.ai_prompt_templates FOR INSERT
WITH CHECK (
    workspace_id IS NULL
    OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can update their prompt templates"
ON public.ai_prompt_templates FOR UPDATE
USING (
    created_by = auth.uid()
    OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Users can delete their prompt templates"
ON public.ai_prompt_templates FOR DELETE
USING (
    created_by = auth.uid()
    OR workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('admin', 'manager')
    )
);

-- AI Analysis Results policies
ALTER TABLE public.ai_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analysis results in their workspaces"
ON public.ai_analysis_results FOR SELECT
USING (
    workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

CREATE POLICY "Users can insert analysis results in their workspaces"
ON public.ai_analysis_results FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
);

-- Insert default system prompt templates
INSERT INTO public.ai_prompt_templates (name, description, prompt_text, category, variables, is_system) VALUES
(
    'Project Health Analysis',
    'Analyzes project health based on tasks, deadlines, and team performance',
    'Analyze the following project data and provide a comprehensive health assessment:

    Project: {{project_name}}
    Total Tasks: {{total_tasks}}
    Completed Tasks: {{completed_tasks}}
    Overdue Tasks: {{overdue_tasks}}
    Team Members: {{team_members}}
    Recent Activity: {{recent_activity}}

    Please provide:
    1. Overall health score (1-100)
    2. Risk factors
    3. Recommendations
    4. Key metrics analysis

    Format your response as JSON with the following structure:
    {
        "health_score": number,
        "status": "excellent|good|fair|poor|critical",
        "risk_factors": [string],
        "recommendations": [string],
        "metrics": {
            "completion_rate": number,
            "schedule_adherence": number,
            "team_productivity": number
        }
    }',
    'project_analysis',
    '["project_name", "total_tasks", "completed_tasks", "overdue_tasks", "team_members", "recent_activity"]',
    true
),
(
    'Team Performance Insights',
    'Provides insights into team performance and productivity',
    'Analyze the following team performance data:

    Team: {{team_name}}
    Members: {{members_count}}
    Completed Tasks (Last 30 days): {{completed_tasks}}
    Average Task Completion Time: {{avg_completion_time}}
    Workload Distribution: {{workload_data}}

    Provide insights on:
    1. Team productivity trends
    2. Workload balance
    3. Performance bottlenecks
    4. Improvement recommendations

    Format as JSON:
    {
        "productivity_score": number,
        "trends": [string],
        "bottlenecks": [string],
        "recommendations": [string],
        "workload_balance": "balanced|overloaded|underutilized"
    }',
    'team_analysis',
    '["team_name", "members_count", "completed_tasks", "avg_completion_time", "workload_data"]',
    true
),
(
    'Risk Assessment',
    'Identifies potential risks in projects and suggests mitigation strategies',
    'Perform a risk assessment based on the following project information:

    Project: {{project_name}}
    Deadline: {{deadline}}
    Progress: {{progress_percentage}}%
    Team Size: {{team_size}}
    Budget Status: {{budget_status}}
    Dependencies: {{dependencies}}

    Identify and analyze:
    1. Schedule risks
    2. Resource risks
    3. Technical risks
    4. Mitigation strategies

    Format as JSON:
    {
        "risk_level": "low|medium|high|critical",
        "risks": [
            {
                "type": string,
                "description": string,
                "probability": number,
                "impact": number,
                "mitigation": string
            }
        ],
        "overall_assessment": string
    }',
    'risk_analysis',
    '["project_name", "deadline", "progress_percentage", "team_size", "budget_status", "dependencies"]',
    true
);

-- Enable realtime for AI tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_management_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_analysis_results;

COMMIT;
