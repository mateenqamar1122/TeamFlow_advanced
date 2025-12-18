import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export interface Goal {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description?: string;
  category: 'company' | 'team' | 'individual';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date: string;
  quarter?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  progress_percentage: number;
  owner_id?: string;
  assignees: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  key_results?: KeyResult[];
  owner?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface KeyResult {
  id: string;
  goal_id: string;
  workspace_id: string;
  title: string;
  description?: string;
  measurement_type: 'percentage' | 'number' | 'currency' | 'boolean';
  target_value: number;
  current_value: number;
  unit?: string;
  due_date?: string;
  status: 'active' | 'completed' | 'at_risk' | 'behind';
  owner_id?: string;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface CreateGoalData {
  title: string;
  description?: string;
  category: Goal['category'];
  priority: Goal['priority'];
  start_date: string;
  end_date: string;
  quarter?: string;
  owner_id?: string;
  assignees?: string[];
  tags?: string[];
}

interface UpdateGoalData {
  title?: string;
  description?: string;
  category?: Goal['category'];
  priority?: Goal['priority'];
  start_date?: string;
  end_date?: string;
  quarter?: string;
  status?: Goal['status'];
  progress_percentage?: number;
  owner_id?: string;
  assignees?: string[];
  tags?: string[];
}

interface CreateKeyResultData {
  title: string;
  description?: string;
  measurement_type: KeyResult['measurement_type'];
  target_value: number;
  unit?: string;
  due_date?: string;
  owner_id?: string;
}

export function useOKRTracking() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch goals
  const fetchGoals = useCallback(async (filters?: {
    category?: Goal['category'];
    status?: Goal['status'];
    quarter?: string;
  }) => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Use basic query to avoid type issues
      let query = (supabase as any)
        .from('goals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.quarter) {
        query = query.eq('quarter', filters.quarter);
      }

      const { data: goalsData, error: goalsError } = await query;

      if (goalsError) throw goalsError;

      // Fetch key results separately
      let goalsWithKeyResults = goalsData;
      if (goalsData && goalsData.length > 0) {
        const goalIds = goalsData.map((goal: any) => goal.id);
        const { data: keyResultsData, error: keyResultsError } = await (supabase as any)
          .from('key_results')
          .select('*')
          .in('goal_id', goalIds);

        if (!keyResultsError && keyResultsData) {
          // Merge key results with goals
          goalsWithKeyResults = goalsData.map((goal: any) => ({
            ...goal,
            key_results: keyResultsData.filter((kr: any) => kr.goal_id === goal.id),
          }));
        }
      }

      setGoals(goalsWithKeyResults || []);
    } catch (err: any) {
      console.error('Error fetching goals:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch goals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Create goal
  const createGoal = useCallback(async (goalData: CreateGoalData) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .insert({
          ...goalData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          assignees: goalData.assignees || [],
          tags: goalData.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      await fetchGoals();
      toast({
        title: 'Goal Created',
        description: 'Goal has been created successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating goal:', err);
      toast({
        title: 'Error',
        description: 'Failed to create goal',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchGoals, toast]);

  // Update goal
  const updateGoal = useCallback(async (goalId: string, updates: UpdateGoalData) => {
    try {
      const { data, error } = await (supabase as any)
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;

      await fetchGoals();
      toast({
        title: 'Goal Updated',
        description: 'Goal has been updated successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating goal:', err);
      toast({
        title: 'Error',
        description: 'Failed to update goal',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchGoals, toast]);

  // Create key result
  const createKeyResult = useCallback(async (goalId: string, keyResultData: CreateKeyResultData) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('key_results')
        .insert({
          ...keyResultData,
          goal_id: goalId,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchGoals();
      toast({
        title: 'Key Result Added',
        description: 'Key result has been added successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating key result:', err);
      toast({
        title: 'Error',
        description: 'Failed to create key result',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, fetchGoals, toast]);

  // Update key result progress
  const updateKeyResultProgress = useCallback(async (keyResultId: string, newValue: number) => {
    try {
      const { data, error } = await (supabase as any)
        .from('key_results')
        .update({
          current_value: newValue,
          status: newValue >= 100 ? 'completed' : 'active'
        })
        .eq('id', keyResultId)
        .select()
        .single();

      if (error) throw error;

      await fetchGoals();
      toast({
        title: 'Progress Updated',
        description: 'Key result progress has been updated',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating key result:', err);
      toast({
        title: 'Error',
        description: 'Failed to update progress',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchGoals, toast]);

  // Get goal statistics
  const getGoalStats = useCallback(() => {
    if (!goals.length) return null;

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const avgProgress = Math.round(
      goals.reduce((sum, g) => sum + g.progress_percentage, 0) / totalGoals
    );

    const keyResults = goals.flatMap(g => g.key_results || []);
    const totalKeyResults = keyResults.length;
    const completedKeyResults = keyResults.filter(kr => kr.status === 'completed').length;

    return {
      totalGoals,
      completedGoals,
      activeGoals,
      avgProgress,
      totalKeyResults,
      completedKeyResults,
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      keyResultCompletionRate: totalKeyResults > 0 ? Math.round((completedKeyResults / totalKeyResults) * 100) : 0,
    };
  }, [goals]);

  // Auto-fetch goals when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchGoals();
    }
  }, [currentWorkspace?.id, fetchGoals]);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    createKeyResult,
    updateKeyResultProgress,
    getGoalStats,
  };
}
