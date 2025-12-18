import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, startOfMonth, startOfQuarter, format, addDays, subDays, isWeekend } from 'date-fns';

export interface WorkloadEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  date: string;
  week_start: string;
  month_start: string;
  quarter_start: string;
  planned_hours: number;
  actual_hours: number;
  overtime_hours: number;
  project_hours: Record<string, number>;
  task_hours: Record<string, number>;
  availability_percentage: number;
  utilization_percentage: number;
  status: 'underloaded' | 'normal' | 'busy' | 'overloaded' | 'unavailable';
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface WorkloadAggregation {
  id: string;
  workspace_id: string;
  aggregation_type: string;
  entity_id: string;
  period_start: string;
  period_end: string;
  total_planned_hours: number;
  total_actual_hours: number;
  total_overtime_hours: number;
  avg_utilization: number;
  max_utilization: number;
  overload_days: number;
  underload_days: number;
  status_breakdown: Record<string, number>;
  calculated_at: string;
}

export interface HeatmapData {
  date: string;
  user_id: string;
  user_name: string;
  utilization: number;
  status: WorkloadEntry['status'];
  planned_hours: number;
  actual_hours: number;
  overtime_hours: number;
  avatar_url?: string;
}

export interface TeamWorkloadSummary {
  team_id: string;
  team_name: string;
  total_members: number;
  avg_utilization: number;
  overloaded_members: number;
  underloaded_members: number;
  total_planned_hours: number;
  total_actual_hours: number;
}

interface CreateWorkloadEntryData {
  user_id: string;
  date: string;
  planned_hours?: number;
  actual_hours?: number;
  overtime_hours?: number;
  project_hours?: Record<string, number>;
  task_hours?: Record<string, number>;
  availability_percentage?: number;
  notes?: string;
}

interface UpdateWorkloadEntryData {
  planned_hours?: number;
  actual_hours?: number;
  overtime_hours?: number;
  project_hours?: Record<string, number>;
  task_hours?: Record<string, number>;
  availability_percentage?: number;
  notes?: string;
}

export function useWorkloadHeatmap() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [workloadEntries, setWorkloadEntries] = useState<WorkloadEntry[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [teamSummaries, setTeamSummaries] = useState<TeamWorkloadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workload entries
  const fetchWorkloadEntries = useCallback(async (
    startDate: Date,
    endDate: Date,
    userIds?: string[],
    teamId?: string
  ) => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
        .from('workload_entries')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('user_id', { ascending: true });

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      const { data: entriesData, error: entriesError } = await query;

      if (entriesError) throw entriesError;

      // If filtering by team, get team member IDs
      if (teamId && (!userIds || userIds.length === 0)) {
        const { data: memberships, error: membershipsError } = await (supabase as any)
          .from('team_memberships')
          .select('user_id')
          .eq('team_id', teamId)
          .eq('is_active', true);

        if (!membershipsError && memberships) {
          const teamMemberIds = memberships.map((m: any) => m.user_id);
          const filteredEntries = entriesData?.filter((entry: any) =>
            teamMemberIds.includes(entry.user_id)
          );
          setWorkloadEntries(filteredEntries || []);
        }
      } else {
        setWorkloadEntries(entriesData || []);
      }

      // Fetch user profiles for display
      if (entriesData && entriesData.length > 0) {
        const uniqueUserIds = [...new Set(entriesData.map((entry: any) => entry.user_id))];
        const { data: profilesData, error: profilesError } = await (supabase as any)
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', uniqueUserIds);

        if (!profilesError && profilesData) {
          // Create heatmap data
          const heatmapData: HeatmapData[] = entriesData.map((entry: any) => {
            const profile = profilesData.find((p: any) => p.id === entry.user_id);
            return {
              date: entry.date,
              user_id: entry.user_id,
              user_name: profile?.display_name || 'Unknown User',
              utilization: entry.utilization_percentage,
              status: entry.status,
              planned_hours: entry.planned_hours,
              actual_hours: entry.actual_hours,
              overtime_hours: entry.overtime_hours,
              avatar_url: profile?.avatar_url,
            };
          });

          setHeatmapData(heatmapData);
        }
      }
    } catch (err: any) {
      console.error('Error fetching workload entries:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch workload data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Create or update workload entry
  const upsertWorkloadEntry = useCallback(async (data: CreateWorkloadEntryData) => {
    if (!currentWorkspace?.id) return null;

    try {
      const targetDate = new Date(data.date);

      // Calculate derived fields
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      const monthStart = startOfMonth(targetDate);
      const quarterStart = startOfQuarter(targetDate);

      // Calculate utilization percentage
      const planned = data.planned_hours || 8;
      const actual = data.actual_hours || 0;
      const overtime = data.overtime_hours || 0;
      const available = (data.availability_percentage || 100) / 100;

      const utilization = planned > 0 ? Math.round((actual / (planned * available)) * 100) : 0;

      // Determine status based on utilization
      let status: WorkloadEntry['status'] = 'normal';
      if (utilization === 0) status = 'unavailable';
      else if (utilization < 70) status = 'underloaded';
      else if (utilization <= 100) status = 'normal';
      else if (utilization <= 120) status = 'busy';
      else status = 'overloaded';

      const entryData = {
        ...data,
        workspace_id: currentWorkspace.id,
        week_start: format(weekStart, 'yyyy-MM-dd'),
        month_start: format(monthStart, 'yyyy-MM-dd'),
        quarter_start: format(quarterStart, 'yyyy-MM-dd'),
        planned_hours: planned,
        actual_hours: actual,
        overtime_hours: overtime,
        availability_percentage: data.availability_percentage || 100,
        utilization_percentage: utilization,
        status,
        project_hours: data.project_hours || {},
        task_hours: data.task_hours || {},
      };

      const { data: result, error } = await (supabase as any)
        .from('workload_entries')
        .upsert(entryData, {
          onConflict: 'workspace_id,user_id,date'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Workload Updated',
        description: 'Workload entry has been updated successfully',
      });

      return result;
    } catch (err: any) {
      console.error('Error updating workload entry:', err);
      toast({
        title: 'Error',
        description: 'Failed to update workload entry',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, toast]);

  // Bulk create workload entries for a user
  const createBulkWorkloadEntries = useCallback(async (
    userId: string,
    startDate: Date,
    endDate: Date,
    defaultPlannedHours: number = 8
  ) => {
    if (!currentWorkspace?.id) return false;

    try {
      const entries = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // Skip weekends by default
        if (!isWeekend(currentDate)) {
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          const monthStart = startOfMonth(currentDate);
          const quarterStart = startOfQuarter(currentDate);

          entries.push({
            workspace_id: currentWorkspace.id,
            user_id: userId,
            date: format(currentDate, 'yyyy-MM-dd'),
            week_start: format(weekStart, 'yyyy-MM-dd'),
            month_start: format(monthStart, 'yyyy-MM-dd'),
            quarter_start: format(quarterStart, 'yyyy-MM-dd'),
            planned_hours: defaultPlannedHours,
            actual_hours: 0,
            overtime_hours: 0,
            availability_percentage: 100,
            utilization_percentage: 0,
            status: 'underloaded',
            project_hours: {},
            task_hours: {},
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const { error } = await (supabase as any)
        .from('workload_entries')
        .upsert(entries, {
          onConflict: 'workspace_id,user_id,date',
          ignoreDuplicates: true
        });

      if (error) throw error;

      toast({
        title: 'Bulk Entries Created',
        description: `Created ${entries.length} workload entries`,
      });

      return true;
    } catch (err: any) {
      console.error('Error creating bulk workload entries:', err);
      toast({
        title: 'Error',
        description: 'Failed to create bulk workload entries',
        variant: 'destructive',
      });
      return false;
    }
  }, [currentWorkspace?.id, toast]);

  // Get team workload summary
  const getTeamWorkloadSummary = useCallback(async (teamId: string, date?: Date) => {
    if (!currentWorkspace?.id) return null;

    try {
      const targetDate = date || new Date();

      const { data, error } = await (supabase as any)
        .rpc('get_team_workload_summary', {
          team_uuid: teamId,
          target_date: format(targetDate, 'yyyy-MM-dd')
        });

      if (error) throw error;

      return data?.[0] || null;
    } catch (err: any) {
      console.error('Error fetching team workload summary:', err);
      return null;
    }
  }, [currentWorkspace?.id]);

  // Calculate workload aggregations
  const calculateAggregations = useCallback(async (startDate: Date, endDate: Date) => {
    if (!currentWorkspace?.id) return false;

    try {
      const { error } = await (supabase as any)
        .rpc('calculate_workload_aggregations', {
          workspace_uuid: currentWorkspace.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd')
        });

      if (error) throw error;

      toast({
        title: 'Aggregations Calculated',
        description: 'Workload aggregations have been updated',
      });

      return true;
    } catch (err: any) {
      console.error('Error calculating aggregations:', err);
      toast({
        title: 'Error',
        description: 'Failed to calculate aggregations',
        variant: 'destructive',
      });
      return false;
    }
  }, [currentWorkspace?.id, toast]);

  // Get heatmap statistics
  const getHeatmapStats = useCallback(() => {
    if (!heatmapData.length) return null;

    const totalEntries = heatmapData.length;
    const uniqueUsers = new Set(heatmapData.map(d => d.user_id)).size;
    const avgUtilization = Math.round(
      heatmapData.reduce((sum, d) => sum + d.utilization, 0) / totalEntries
    );

    const statusCounts = heatmapData.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overloadedDays = statusCounts.overloaded || 0;
    const overloadedPercentage = Math.round((overloadedDays / totalEntries) * 100);

    const userUtilizations = heatmapData.reduce((acc, d) => {
      if (!acc[d.user_id]) {
        acc[d.user_id] = {
          user_name: d.user_name,
          total_utilization: 0,
          days_count: 0,
          overloaded_days: 0,
        };
      }
      acc[d.user_id].total_utilization += d.utilization;
      acc[d.user_id].days_count += 1;
      if (d.status === 'overloaded') {
        acc[d.user_id].overloaded_days += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    const topOverloadedUsers = Object.entries(userUtilizations)
      .map(([userId, stats]: [string, any]) => ({
        user_id: userId,
        user_name: stats.user_name,
        avg_utilization: Math.round(stats.total_utilization / stats.days_count),
        overloaded_days: stats.overloaded_days,
        overload_percentage: Math.round((stats.overloaded_days / stats.days_count) * 100),
      }))
      .sort((a, b) => b.overload_percentage - a.overload_percentage)
      .slice(0, 5);

    return {
      totalEntries,
      uniqueUsers,
      avgUtilization,
      statusCounts,
      overloadedPercentage,
      topOverloadedUsers,
    };
  }, [heatmapData]);

  // Get color for utilization level
  const getUtilizationColor = useCallback((utilization: number) => {
    if (utilization === 0) return '#9ca3af'; // Gray - unavailable
    if (utilization < 70) return '#3b82f6'; // Blue - underloaded
    if (utilization <= 100) return '#10b981'; // Green - normal
    if (utilization <= 120) return '#f59e0b'; // Yellow - busy
    return '#ef4444'; // Red - overloaded
  }, []);

  // Get status color
  const getStatusColor = useCallback((status: WorkloadEntry['status']) => {
    switch (status) {
      case 'underloaded': return '#3b82f6';
      case 'normal': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'overloaded': return '#ef4444';
      case 'unavailable': return '#9ca3af';
      default: return '#6b7280';
    }
  }, []);

  return {
    workloadEntries,
    heatmapData,
    teamSummaries,
    loading,
    error,
    fetchWorkloadEntries,
    upsertWorkloadEntry,
    createBulkWorkloadEntries,
    getTeamWorkloadSummary,
    calculateAggregations,
    getHeatmapStats,
    getUtilizationColor,
    getStatusColor,
  };
}
