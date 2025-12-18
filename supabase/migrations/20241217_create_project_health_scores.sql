-- Create project_health_scores table for storing AI analysis results
CREATE TABLE IF NOT EXISTS project_health_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  health_status TEXT NOT NULL CHECK (health_status IN ('excellent', 'good', 'warning', 'critical')),
  metrics JSONB NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '{}',
  trends JSONB NOT NULL DEFAULT '{}',
  predictions JSONB NOT NULL DEFAULT '{}',
  analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_health_scores_project_id ON project_health_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_project_health_scores_workspace_id ON project_health_scores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_health_scores_created_at ON project_health_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_health_scores_health_status ON project_health_scores(health_status);

-- Enable RLS
ALTER TABLE project_health_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view health scores for their workspace projects"
ON project_health_scores FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

CREATE POLICY "Users can insert health scores for their workspace projects"
ON project_health_scores FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

CREATE POLICY "Users can update health scores for their workspace projects"
ON project_health_scores FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_project_health_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_project_health_scores_updated_at
  BEFORE UPDATE ON project_health_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_project_health_scores_updated_at();

-- Add the table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE project_health_scores;
