-- Create workload metrics table to store historical data
CREATE TABLE workload_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID,
  task_count INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  hours_worked DECIMAL(5,2) DEFAULT 0,
  productivity_score DECIMAL(3,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id, date)
);

-- Create workload forecasts table to store AI predictions
CREATE TABLE workload_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID,
  forecast_date DATE NOT NULL,
  predicted_workload DECIMAL(5,2) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  recommendations JSONB,
  forecast_type VARCHAR(50) DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_workload_metrics_workspace_date ON workload_metrics(workspace_id, date);
CREATE INDEX idx_workload_metrics_user_date ON workload_metrics(user_id, date);
CREATE INDEX idx_workload_forecasts_workspace_date ON workload_forecasts(workspace_id, forecast_date);
CREATE INDEX idx_workload_forecasts_user_date ON workload_forecasts(user_id, forecast_date);

-- Add RLS policies
ALTER TABLE workload_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_forecasts ENABLE ROW LEVEL SECURITY;

-- Policies for workload_metrics
CREATE POLICY "Users can view workload metrics for their workspaces" ON workload_metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert workload metrics for their workspaces" ON workload_metrics
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workload metrics for their workspaces" ON workload_metrics
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policies for workload_forecasts
CREATE POLICY "Users can view workload forecasts for their workspaces" ON workload_forecasts
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert workload forecasts for their workspaces" ON workload_forecasts
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workload forecasts for their workspaces" ON workload_forecasts
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE workload_metrics IS 'Historical workload data for forecasting';
COMMENT ON TABLE workload_forecasts IS 'AI-generated workload predictions using Gemini API';
COMMENT ON COLUMN workload_metrics.productivity_score IS 'Score from 0-1 representing daily productivity';
COMMENT ON COLUMN workload_forecasts.confidence_score IS 'AI confidence in prediction from 0-1';
COMMENT ON COLUMN workload_forecasts.recommendations IS 'JSON object containing AI recommendations';
