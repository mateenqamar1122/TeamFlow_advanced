import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TaskEstimation {
  id: string;
  workspace_id: string;
  user_id: string | null;
  task_id: string | null;
  task_title: string;
  task_description: string | null;
  task_priority: string;
  task_complexity: string;
  estimated_hours: number;
  confidence_score: number;
  estimation_factors: {
    complexity_analysis: string;
    priority_impact: string;
    historical_similarity: string;
    risk_factors: string[];
    assumptions: string[];
    methodology: string;
  };
  similar_tasks_analyzed: number;
  historical_accuracy: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletionHistory {
  id: string;
  workspace_id: string;
  user_id: string | null;
  task_id: string | null;
  task_title: string;
  task_description: string | null;
  task_priority: string;
  task_complexity: string;
  estimated_hours: number | null;
  actual_hours: number;
  completion_date: string;
  accuracy_score: number | null;
  factors: any;
  created_at: string;
}

export interface TimeBreakdown {
  planning: number;
  development: number;
  testing: number;
  review: number;
}

export interface EstimationRequest {
  task_id?: string;
  task_title: string;
  task_description?: string;
  task_priority?: 'low' | 'medium' | 'high' | 'urgent';
  task_complexity?: 'low' | 'medium' | 'high' | 'very_high';
  project_type?: string;
  similar_tasks?: boolean;
}

export interface EstimationResponse {
  success: boolean;
  estimation: TaskEstimation;
  time_breakdown?: TimeBreakdown;
  recommendations?: string[];
  metadata: {
    similar_tasks_found: number;
    current_tasks_analyzed: number;
    ai_model: string;
    estimation_method: string;
  };
}

export interface RecordCompletionParams {
  task_id?: string;
  task_title: string;
  task_description?: string;
  task_priority: string;
  task_complexity: string;
  estimated_hours?: number;
  actual_hours: number;
  completion_date?: string;
  factors?: any;
}

export function useTaskTimeEstimator(workspaceId?: string) {
  const [estimations, setEstimations] = useState<TaskEstimation[]>([]);
  const [completionHistory, setCompletionHistory] = useState<TaskCompletionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingEstimation, setGeneratingEstimation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEstimationResponse, setLastEstimationResponse] = useState<EstimationResponse | null>(null);
  const { toast } = useToast();

  // Auto-fetch data when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      fetchEstimations();
      fetchCompletionHistory();
    }
  }, [workspaceId]);

  const generateEstimation = useCallback(async (
    request: EstimationRequest
  ): Promise<EstimationResponse | null> => {
    if (!workspaceId) {
      const errorMsg = 'Workspace ID is required for generating estimations';
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    }

    const {
      task_id,
      task_title,
      task_description = '',
      task_priority = 'medium',
      task_complexity = 'medium',
      project_type = '',
      similar_tasks = true
    } = request;

    setGeneratingEstimation(true);
    setError(null);

    try {
      console.log('Generating estimation with params:', {
        workspaceId,
        task_title,
        task_priority,
        task_complexity
      });

      let data, functionError;

      // Try the main function first
      const mainResult = await supabase.functions.invoke('task-time-estimator', {
        body: {
          workspace_id: workspaceId,
          task_id,
          task_title,
          task_description,
          task_priority,
          task_complexity,
          project_type,
          similar_tasks
        }
      });

      // If main function fails, use client-side fallback
      if (mainResult.error) {
        console.warn('Main function failed, using client-side estimation:', mainResult.error);

        const fallbackEstimation = generateClientSideFallback(
          task_title,
          task_description,
          task_priority,
          task_complexity
        );

        // Try to save to database
        try {
          const { data: savedEstimation } = await supabase
            .from('task_estimations')
            .insert({
              workspace_id: workspaceId,
              task_id: task_id || null,
              task_title,
              task_description: task_description || null,
              task_priority,
              task_complexity,
              estimated_hours: fallbackEstimation.estimated_hours,
              confidence_score: fallbackEstimation.confidence_score,
              estimation_factors: fallbackEstimation.estimation_factors,
              similar_tasks_analyzed: 0
            })
            .select()
            .single();

          const estimationResponse = {
            success: true,
            estimation: savedEstimation,
            time_breakdown: fallbackEstimation.time_breakdown,
            recommendations: fallbackEstimation.recommendations,
            metadata: {
              similar_tasks_found: 0,
              current_tasks_analyzed: 0,
              ai_model: 'client-side-fallback',
              estimation_method: 'rule_based'
            }
          };

          setLastEstimationResponse(estimationResponse);

          toast({
            title: "Estimation Generated (Demo Mode)",
            description: "Using client-side estimation. Deploy Edge Functions for AI-powered estimates.",
          });

          await fetchEstimations();
          return estimationResponse;

        } catch (dbError) {
          console.warn('Database save failed:', dbError);

          const mockEstimation = {
            id: `mock-${Date.now()}`,
            workspace_id: workspaceId,
            user_id: null,
            task_id: task_id || null,
            task_title,
            task_description: task_description || null,
            task_priority,
            task_complexity,
            estimated_hours: fallbackEstimation.estimated_hours,
            confidence_score: fallbackEstimation.confidence_score,
            estimation_factors: fallbackEstimation.estimation_factors,
            similar_tasks_analyzed: 0,
            historical_accuracy: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const mockResponse = {
            success: true,
            estimation: mockEstimation,
            time_breakdown: fallbackEstimation.time_breakdown,
            recommendations: fallbackEstimation.recommendations,
            metadata: {
              similar_tasks_found: 0,
              current_tasks_analyzed: 0,
              ai_model: 'client-side-fallback',
              estimation_method: 'rule_based'
            }
          };

          setLastEstimationResponse(mockResponse);

          toast({
            title: "Demo Estimation Generated",
            description: "Using demo data. Deploy database migration and Edge Functions for full functionality.",
          });

          return mockResponse;
        }
      } else {
        data = mainResult.data;
        functionError = mainResult.error;
      }

      if (functionError) {
        console.error('Supabase function error:', functionError);
        throw new Error(functionError.message || 'Failed to call estimation function');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate estimation');
      }

      console.log('Estimation generated successfully:', data);

      setLastEstimationResponse(data);

      toast({
        title: "Estimation Generated Successfully",
        description: `AI estimated ${data.estimation.estimated_hours}h with ${(data.estimation.confidence_score * 100).toFixed(1)}% confidence`,
      });

      // Refresh estimations list
      await fetchEstimations();

      return data;

    } catch (err) {
      console.error('Error generating estimation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate task estimation';
      setError(errorMessage);

      toast({
        title: "Estimation Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return null;
    } finally {
      setGeneratingEstimation(false);
    }
  }, [workspaceId, toast]);

  const fetchEstimations = useCallback(async (limit: number = 50) => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_estimations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching estimations:', error);
        throw error;
      }

      console.log('Fetched estimations:', data?.length || 0);
      setEstimations(data || []);

    } catch (err) {
      console.error('Error fetching estimations:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch estimations';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchCompletionHistory = useCallback(async (limit: number = 100) => {
    if (!workspaceId) return;

    try {
      const { data, error } = await supabase
        .from('task_completion_history')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('completion_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching completion history:', error);
        throw error;
      }

      console.log('Fetched completion history:', data?.length || 0);
      setCompletionHistory(data || []);

    } catch (err) {
      console.error('Error fetching completion history:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch completion history';
      setError(errorMsg);
    }
  }, [workspaceId]);

  const recordCompletion = useCallback(async (
    params: RecordCompletionParams
  ): Promise<boolean> => {
    if (!workspaceId) {
      setError('Workspace ID is required for recording completion');
      return false;
    }

    const {
      task_id,
      task_title,
      task_description,
      task_priority,
      task_complexity,
      estimated_hours,
      actual_hours,
      completion_date,
      factors
    } = params;

    const completionDateStr = completion_date || new Date().toISOString().split('T')[0];
    let accuracy_score = null;

    if (estimated_hours && estimated_hours > 0) {
      // Calculate accuracy score (1.0 = perfect, lower = less accurate)
      const ratio = Math.min(estimated_hours, actual_hours) / Math.max(estimated_hours, actual_hours);
      accuracy_score = ratio;
    }

    try {
      // Validate inputs
      if (actual_hours <= 0) {
        throw new Error('Actual hours must be greater than 0');
      }

      const { error } = await supabase
        .from('task_completion_history')
        .insert({
          workspace_id: workspaceId,
          task_id: task_id || null,
          task_title,
          task_description: task_description || null,
          task_priority,
          task_complexity,
          estimated_hours: estimated_hours || null,
          actual_hours,
          completion_date: completionDateStr,
          accuracy_score,
          factors: factors || null
        });

      if (error) {
        console.error('Error recording completion:', error);
        throw error;
      }

      console.log('Completion recorded successfully for:', task_title);

      toast({
        title: "Task Completion Recorded",
        description: `Recorded ${actual_hours}h completion time for "${task_title}"`,
      });

      // Refresh completion history
      await fetchCompletionHistory();
      return true;

    } catch (err) {
      console.error('Error recording completion:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to record task completion';
      setError(errorMsg);

      toast({
        title: "Error Recording Completion",
        description: errorMsg,
        variant: "destructive",
      });

      return false;
    }
  }, [workspaceId, fetchCompletionHistory, toast]);

  const deleteEstimation = useCallback(async (estimationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_estimations')
        .delete()
        .eq('id', estimationId);

      if (error) throw error;

      toast({
        title: "Estimation Deleted",
        description: "Task estimation has been removed",
      });

      await fetchEstimations();
      return true;

    } catch (err) {
      console.error('Error deleting estimation:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete estimation';
      setError(errorMsg);

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });

      return false;
    }
  }, [fetchEstimations, toast]);

  const getLatestEstimation = useCallback((): TaskEstimation | null => {
    return estimations.length > 0 ? estimations[0] : null;
  }, [estimations]);

  const getAccuracyMetrics = useCallback(() => {
    const completedWithEstimates = completionHistory.filter(h =>
      h.estimated_hours && h.estimated_hours > 0 && h.accuracy_score !== null
    );

    if (completedWithEstimates.length === 0) {
      return {
        averageAccuracy: 0,
        totalCompletions: completionHistory.length,
        estimatedCompletions: 0,
        trend: 'neutral' as 'improving' | 'declining' | 'neutral'
      };
    }

    const avgAccuracy = completedWithEstimates.reduce((sum, h) =>
      sum + (h.accuracy_score || 0), 0
    ) / completedWithEstimates.length;

    // Calculate trend (recent vs older)
    const recent = completedWithEstimates.slice(0, 10);
    const older = completedWithEstimates.slice(10, 20);

    let trend: 'improving' | 'declining' | 'neutral' = 'neutral';

    if (recent.length >= 3 && older.length >= 3) {
      const recentAvg = recent.reduce((sum, h) => sum + (h.accuracy_score || 0), 0) / recent.length;
      const olderAvg = older.reduce((sum, h) => sum + (h.accuracy_score || 0), 0) / older.length;

      const difference = recentAvg - olderAvg;
      if (difference > 0.05) trend = 'improving';
      else if (difference < -0.05) trend = 'declining';
    }

    return {
      averageAccuracy: avgAccuracy,
      totalCompletions: completionHistory.length,
      estimatedCompletions: completedWithEstimates.length,
      trend
    };
  }, [completionHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    estimations,
    completionHistory,
    loading,
    generatingEstimation,
    error,
    lastEstimationResponse,

    // Actions
    generateEstimation,
    fetchEstimations,
    fetchCompletionHistory,
    recordCompletion,
    deleteEstimation,
    clearError,

    // Computed data
    getLatestEstimation,
    getAccuracyMetrics,

    // Utilities
    isReady: !!workspaceId,
    hasEstimations: estimations.length > 0,
    hasCompletionHistory: completionHistory.length > 0
  };
}

// Client-side fallback estimation function
function generateClientSideFallback(
  taskTitle: string,
  taskDescription: string,
  priority: string,
  complexity: string
) {
  // Rule-based estimation
  const baseHours = {
    'low': 3,
    'medium': 8,
    'high': 16,
    'very_high': 24
  }[complexity] || 8;

  const priorityMultiplier = {
    'low': 0.8,
    'medium': 1.0,
    'high': 1.2,
    'urgent': 1.4
  }[priority] || 1.0;

  const estimatedHours = Math.round(baseHours * priorityMultiplier * 10) / 10;

  // Generate time breakdown
  const timeBreakdown = {
    planning: Math.round(estimatedHours * 0.2 * 10) / 10,
    development: Math.round(estimatedHours * 0.5 * 10) / 10,
    testing: Math.round(estimatedHours * 0.2 * 10) / 10,
    review: Math.round(estimatedHours * 0.1 * 10) / 10
  };

  return {
    estimated_hours: estimatedHours,
    confidence_score: 0.6,
    estimation_factors: {
      complexity_analysis: `Task classified as ${complexity} complexity requiring ${baseHours} base hours`,
      priority_impact: `${priority} priority adds ${((priorityMultiplier - 1) * 100).toFixed(0)}% adjustment`,
      historical_similarity: "No historical data available for comparison",
      risk_factors: ["Limited data available", "Rule-based estimation"],
      assumptions: ["Standard development workflow", "No major dependencies"],
      methodology: "Rule-based estimation using complexity and priority factors"
    },
    time_breakdown: timeBreakdown,
    recommendations: [
      "Break down the task into smaller subtasks for better tracking",
      "Record actual completion time to improve future estimates",
      "Consider potential dependencies and blockers"
    ]
  };
}
