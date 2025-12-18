import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProjectHealthMetrics {
  completion_rate: number;
  schedule_adherence: number;
  team_productivity: number;
  quality_indicators: number;
  risk_factors: number;
}

export interface ProjectHealthInsights {
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  key_risks: string[];
}

export interface ProjectHealthTrends {
  progress_velocity: number;
  burndown_rate: number;
  team_efficiency: number;
}

export interface ProjectHealthPredictions {
  estimated_completion_date: string;
  completion_probability: number;
  budget_variance_prediction: number;
}

export interface ProjectHealthScore {
  id?: string;
  project_id: string;
  workspace_id: string;
  overall_score: number;
  health_status: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: ProjectHealthMetrics;
  insights: ProjectHealthInsights;
  trends: ProjectHealthTrends;
  predictions: ProjectHealthPredictions;
  analysis_data?: any;
  created_at?: string;
  updated_at?: string;
}

export const useProjectHealthScore = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectHealthScore | null>(null);
  const { user } = useAuth();

  const generateHealthScore = async (projectId: string, workspaceId: string): Promise<ProjectHealthScore | null> => {
    if (!user || !projectId || !workspaceId) {
      toast.error("Missing required information");
      return null;
    }

    setLoading(true);

    try {
      console.log(`Generating health score for project: ${projectId}`);

      const { data, error } = await supabase.functions.invoke('ai-project-health-score', {
        body: {
          project_id: projectId,
          workspace_id: workspaceId
        }
      });

      if (error) {
        console.error('Error generating health score:', error);

        // Check if it's a database table issue
        if (error.message && error.message.includes('project_health_scores')) {
          toast.error("Database setup required. Please run the health scores migration first.");
        } else if (error.message && error.message.includes('GEMINI_API_KEY')) {
          toast.error("AI service not configured. Please contact administrator.");
        } else {
          toast.error("Failed to generate project health score. Please try again.");
        }
        return null;
      }

      if (!data || !data.success) {
        console.error('Invalid response from health score function:', data);
        toast.error(data?.error || "Invalid response from AI analysis");
        return null;
      }

      if (!data.health_score) {
        console.error('No health score in response:', data);
        toast.error("AI analysis completed but no score generated");
        return null;
      }

      const healthScore: ProjectHealthScore = {
        project_id: projectId,
        workspace_id: workspaceId,
        ...data.health_score
      };

      setAnalysis(healthScore);

      toast.success("Project health score generated successfully!");

      return healthScore;

    } catch (error) {
      console.error('Error generating health score:', error);

      if (error instanceof Error) {
        if (error.message.includes('Edge Function returned a non-2xx status code')) {
          toast.error("AI analysis service is currently unavailable. Please try again later.");
        } else if (error.message.includes('network')) {
          toast.error("Network error. Please check your connection and try again.");
        } else {
          toast.error(`Analysis failed: ${error.message}`);
        }
      } else {
        toast.error("An unexpected error occurred while generating health score");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getLatestHealthScore = async (projectId: string, workspaceId: string): Promise<ProjectHealthScore | null> => {
    if (!projectId || !workspaceId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('project_health_scores')
        .select('*')
        .eq('project_id', projectId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        // If table doesn't exist, return null silently
        if (error.code === 'PGRST106' || error.code === '42P01') {
          console.log('Project health scores table not found - this is normal for first use');
          return null;
        }
        console.error('Error fetching latest health score:', error);
        return null;
      }

      // Return first item or null if empty array
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching latest health score:', error);
      return null;
    }
  };

  const getAllHealthScores = async (projectId: string, workspaceId: string): Promise<ProjectHealthScore[]> => {
    if (!projectId || !workspaceId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('project_health_scores')
        .select('*')
        .eq('project_id', projectId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array silently
        if (error.code === 'PGRST106' || error.code === '42P01') {
          console.log('Project health scores table not found - this is normal for first use');
          return [];
        }
        console.error('Error fetching health scores:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching health scores:', error);
      return [];
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return '🎯';
      case 'good':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🚨';
      default:
        return '📊';
    }
  };

  return {
    loading,
    analysis,
    generateHealthScore,
    getLatestHealthScore,
    getAllHealthScores,
    getHealthStatusColor,
    getHealthStatusIcon,
    setAnalysis
  };
};
