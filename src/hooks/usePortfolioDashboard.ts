import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export interface Portfolio {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description?: string;
  code?: string;
  manager_id?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  actual_cost: number;
  start_date?: string;
  end_date?: string;
  progress_percentage: number;
  health_status: 'on_track' | 'at_risk' | 'behind' | 'blocked';
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  manager?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  projects?: Project[];
  metrics?: PortfolioMetrics;
}

export interface PortfolioProject {
  id: string;
  portfolio_id: string;
  project_id: string;
  workspace_id: string;
  added_by: string;
  priority_in_portfolio: number;
  contribution_weight: number;
  added_at: string;
}

export interface PortfolioMetrics {
  id: string;
  portfolio_id: string;
  workspace_id: string;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  on_hold_projects: number;
  total_budget: number;
  spent_budget: number;
  remaining_budget: number;
  budget_variance_percentage: number;
  projects_on_time: number;
  projects_at_risk: number;
  projects_behind: number;
  total_team_members: number;
  total_tasks: number;
  completed_tasks: number;
  calculated_at: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget?: number;
  actual_cost: number;
  start_date?: string;
  end_date?: string;
  manager_id?: string;
}

interface CreatePortfolioData {
  name: string;
  description?: string;
  code?: string;
  manager_id?: string;
  status?: Portfolio['status'];
  priority?: Portfolio['priority'];
  budget?: number;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

interface UpdatePortfolioData {
  name?: string;
  description?: string;
  code?: string;
  manager_id?: string;
  status?: Portfolio['status'];
  priority?: Portfolio['priority'];
  budget?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
  progress_percentage?: number;
  health_status?: Portfolio['health_status'];
  tags?: string[];
  metadata?: Record<string, any>;
}

export function usePortfolioDashboard() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch portfolios
  const fetchPortfolios = useCallback(async (filters?: {
    status?: Portfolio['status'];
    manager_id?: string;
    health_status?: Portfolio['health_status'];
  }) => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
        .from('portfolios')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.manager_id) {
        query = query.eq('manager_id', filters.manager_id);
      }
      if (filters?.health_status) {
        query = query.eq('health_status', filters.health_status);
      }

      const { data: portfoliosData, error: portfoliosError } = await query;

      if (portfoliosError) throw portfoliosError;

      // Fetch portfolio metrics
      let portfoliosWithMetrics = portfoliosData;
      if (portfoliosData && portfoliosData.length > 0) {
        const portfolioIds = portfoliosData.map((p: any) => p.id);

        const { data: metricsData, error: metricsError } = await (supabase as any)
          .from('portfolio_metrics')
          .select('*')
          .in('portfolio_id', portfolioIds);

        if (!metricsError && metricsData) {
          portfoliosWithMetrics = portfoliosData.map((portfolio: any) => ({
            ...portfolio,
            metrics: metricsData.find((m: any) => m.portfolio_id === portfolio.id),
          }));
        }

        // Fetch related projects
        const { data: portfolioProjectsData, error: ppError } = await (supabase as any)
          .from('portfolio_projects')
          .select(`
            *,
            project:projects(id, name, status, progress, budget, actual_cost, start_date, end_date, manager_id)
          `)
          .in('portfolio_id', portfolioIds);

        if (!ppError && portfolioProjectsData) {
          portfoliosWithMetrics = portfoliosWithMetrics.map((portfolio: any) => ({
            ...portfolio,
            projects: portfolioProjectsData
              .filter((pp: any) => pp.portfolio_id === portfolio.id)
              .map((pp: any) => pp.project),
          }));
        }
      }

      setPortfolios(portfoliosWithMetrics || []);
    } catch (err: any) {
      console.error('Error fetching portfolios:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch portfolios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Create portfolio
  const createPortfolio = useCallback(async (portfolioData: CreatePortfolioData) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('portfolios')
        .insert({
          ...portfolioData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          tags: portfolioData.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPortfolios();
      toast({
        title: 'Portfolio Created',
        description: 'Portfolio has been created successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating portfolio:', err);
      toast({
        title: 'Error',
        description: 'Failed to create portfolio',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchPortfolios, toast]);

  // Update portfolio
  const updatePortfolio = useCallback(async (portfolioId: string, updates: UpdatePortfolioData) => {
    try {
      const { data, error } = await (supabase as any)
        .from('portfolios')
        .update(updates)
        .eq('id', portfolioId)
        .select()
        .single();

      if (error) throw error;

      // Recalculate metrics if needed
      if (updates.status || updates.budget) {
        await calculatePortfolioMetrics(portfolioId);
      }

      await fetchPortfolios();
      toast({
        title: 'Portfolio Updated',
        description: 'Portfolio has been updated successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating portfolio:', err);
      toast({
        title: 'Error',
        description: 'Failed to update portfolio',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchPortfolios, toast]);

  // Delete portfolio
  const deletePortfolio = useCallback(async (portfolioId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('portfolios')
        .delete()
        .eq('id', portfolioId);

      if (error) throw error;

      await fetchPortfolios();
      toast({
        title: 'Portfolio Deleted',
        description: 'Portfolio has been deleted successfully',
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting portfolio:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete portfolio',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchPortfolios, toast]);

  // Add project to portfolio
  const addProjectToPortfolio = useCallback(async (
    portfolioId: string,
    projectId: string,
    options?: { priority?: number; weight?: number }
  ) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('portfolio_projects')
        .insert({
          portfolio_id: portfolioId,
          project_id: projectId,
          workspace_id: currentWorkspace.id,
          added_by: user.id,
          priority_in_portfolio: options?.priority || 1,
          contribution_weight: options?.weight || 100,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate portfolio metrics
      await calculatePortfolioMetrics(portfolioId);
      await fetchPortfolios();

      toast({
        title: 'Project Added',
        description: 'Project has been added to portfolio',
      });

      return data;
    } catch (err: any) {
      console.error('Error adding project to portfolio:', err);
      toast({
        title: 'Error',
        description: 'Failed to add project to portfolio',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchPortfolios, toast]);

  // Remove project from portfolio
  const removeProjectFromPortfolio = useCallback(async (portfolioId: string, projectId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('portfolio_projects')
        .delete()
        .eq('portfolio_id', portfolioId)
        .eq('project_id', projectId);

      if (error) throw error;

      // Recalculate portfolio metrics
      await calculatePortfolioMetrics(portfolioId);
      await fetchPortfolios();

      toast({
        title: 'Project Removed',
        description: 'Project has been removed from portfolio',
      });

      return true;
    } catch (err: any) {
      console.error('Error removing project from portfolio:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove project from portfolio',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchPortfolios, toast]);

  // Calculate portfolio metrics
  const calculatePortfolioMetrics = useCallback(async (portfolioId: string) => {
    try {
      const { error } = await (supabase as any)
        .rpc('calculate_portfolio_metrics', { portfolio_uuid: portfolioId });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error calculating portfolio metrics:', err);
    }
  }, []);

  // Get dashboard statistics
  const getDashboardStats = useCallback(() => {
    if (!portfolios.length) return null;

    const totalPortfolios = portfolios.length;
    const activePortfolios = portfolios.filter(p => p.status === 'active').length;
    const completedPortfolios = portfolios.filter(p => p.status === 'completed').length;
    const atRiskPortfolios = portfolios.filter(p => p.health_status === 'at_risk' || p.health_status === 'behind').length;

    const totalProjects = portfolios.reduce((sum, p) => sum + (p.metrics?.total_projects || 0), 0);
    const totalBudget = portfolios.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = portfolios.reduce((sum, p) => sum + (p.metrics?.spent_budget || 0), 0);
    const avgProgress = Math.round(
      portfolios.reduce((sum, p) => sum + p.progress_percentage, 0) / totalPortfolios
    );

    return {
      totalPortfolios,
      activePortfolios,
      completedPortfolios,
      atRiskPortfolios,
      totalProjects,
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
      avgProgress,
      budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    };
  }, [portfolios]);

  // Auto-fetch portfolios when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchPortfolios();
    }
  }, [currentWorkspace?.id, fetchPortfolios]);

  return {
    portfolios,
    loading,
    error,
    fetchPortfolios,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    addProjectToPortfolio,
    removeProjectFromPortfolio,
    calculatePortfolioMetrics,
    getDashboardStats,
  };
}
