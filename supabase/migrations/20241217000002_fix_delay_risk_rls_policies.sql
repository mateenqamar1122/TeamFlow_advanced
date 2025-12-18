-- Fix AI Delay-Risk Detection RLS and CORS issues
-- Migration: 20241217000002_fix_delay_risk_rls_policies.sql

-- Add service role bypass policies for all AI delay-risk tables
-- This allows edge functions to write data while maintaining user-level security

-- Service role bypass for task_risk_assessments
CREATE POLICY IF NOT EXISTS "Service role bypass for task_risk_assessments"
    ON task_risk_assessments FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Service role bypass for risk_alerts
CREATE POLICY IF NOT EXISTS "Service role bypass for risk_alerts"
    ON risk_alerts FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Service role bypass for delay_risk_patterns
CREATE POLICY IF NOT EXISTS "Service role bypass for delay_risk_patterns"
    ON delay_risk_patterns FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Service role bypass for project_risk_analytics
CREATE POLICY IF NOT EXISTS "Service role bypass for project_risk_analytics"
    ON project_risk_analytics FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Service role bypass for risk_detection_settings
CREATE POLICY IF NOT EXISTS "Service role bypass for risk_detection_settings"
    ON risk_detection_settings FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure service role can read required tables for AI analysis
CREATE POLICY IF NOT EXISTS "Service role can read tasks for AI analysis"
    ON tasks FOR SELECT
    TO service_role
    USING (true);

-- Allow service role to read workspace_members for context
CREATE POLICY IF NOT EXISTS "Service role can read workspace_members for AI"
    ON workspace_members FOR SELECT
    TO service_role
    USING (true);

-- Allow service role to read projects for analysis
CREATE POLICY IF NOT EXISTS "Service role can read projects for AI"
    ON projects FOR SELECT
    TO service_role
    USING (true);

-- Add indexes for better AI analysis performance
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_due ON tasks(workspace_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_priority ON tasks(created_at, priority);

-- Grant necessary permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
