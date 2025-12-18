-- Task Completion Time Estimator Database Schema
-- Creates tables for storing task estimation data and AI predictions

-- Table to store task estimation requests and results
CREATE TABLE IF NOT EXISTS task_estimations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID,
  task_id UUID,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_priority TEXT DEFAULT 'medium',
  task_complexity TEXT DEFAULT 'medium',
  estimated_hours DECIMAL(5,2) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  estimation_factors JSONB,
  similar_tasks_analyzed INTEGER DEFAULT 0,
  historical_accuracy DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store historical task completion data for learning
CREATE TABLE IF NOT EXISTS task_completion_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID,
  task_id UUID,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_priority TEXT,
  task_complexity TEXT,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2) NOT NULL,
  completion_date DATE NOT NULL,
  accuracy_score DECIMAL(3,2),
  factors JSONB, -- Store contextual factors that affected completion time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store estimation models and patterns
CREATE TABLE IF NOT EXISTS estimation_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(50) DEFAULT 'ai_generated',
  complexity_factors JSONB,
  priority_multipliers JSONB,
  user_velocity_factors JSONB,
  accuracy_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, model_name)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_estimations_workspace ON task_estimations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_estimations_user ON task_estimations(user_id);
CREATE INDEX IF NOT EXISTS idx_task_estimations_created ON task_estimations(created_at);
CREATE INDEX IF NOT EXISTS idx_task_completion_workspace ON task_completion_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_user ON task_completion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_date ON task_completion_history(completion_date);
CREATE INDEX IF NOT EXISTS idx_estimation_models_workspace ON estimation_models(workspace_id);

-- Enable Row Level Security
ALTER TABLE task_estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_estimations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_estimations'
    AND policyname = 'Users can view task estimations for their workspaces'
  ) THEN
    CREATE POLICY "Users can view task estimations for their workspaces" ON task_estimations
      FOR SELECT USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_estimations'
    AND policyname = 'Users can insert task estimations for their workspaces'
  ) THEN
    CREATE POLICY "Users can insert task estimations for their workspaces" ON task_estimations
      FOR INSERT WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Policies for task_completion_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_completion_history'
    AND policyname = 'Users can view completion history for their workspaces'
  ) THEN
    CREATE POLICY "Users can view completion history for their workspaces" ON task_completion_history
      FOR SELECT USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_completion_history'
    AND policyname = 'Users can insert completion history for their workspaces'
  ) THEN
    CREATE POLICY "Users can insert completion history for their workspaces" ON task_completion_history
      FOR INSERT WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Policies for estimation_models
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estimation_models'
    AND policyname = 'Users can view estimation models for their workspaces'
  ) THEN
    CREATE POLICY "Users can view estimation models for their workspaces" ON estimation_models
      FOR SELECT USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estimation_models'
    AND policyname = 'Users can manage estimation models for their workspaces'
  ) THEN
    CREATE POLICY "Users can manage estimation models for their workspaces" ON estimation_models
      FOR ALL USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE task_estimations IS 'AI-generated task completion time estimates';
COMMENT ON TABLE task_completion_history IS 'Historical task completion data for improving estimates';
COMMENT ON TABLE estimation_models IS 'Workspace-specific estimation models and patterns';
COMMENT ON COLUMN task_estimations.confidence_score IS 'AI confidence in estimation from 0-1';
COMMENT ON COLUMN task_estimations.estimation_factors IS 'JSON object containing factors that influenced the estimate';
COMMENT ON COLUMN task_completion_history.accuracy_score IS 'How accurate the original estimate was (0-1)';
COMMENT ON COLUMN estimation_models.complexity_factors IS 'JSON mapping of complexity levels to time multipliers';
