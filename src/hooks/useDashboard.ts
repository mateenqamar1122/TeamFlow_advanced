import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';

export interface DashboardWidget {
  id: string;
  user_id: string;
  widget_type: 'stats_overview' | 'recent_projects' | 'upcoming_tasks' | 'activity_feed' |
               'team_performance' | 'project_progress' | 'task_distribution' | 'calendar' |
               'notifications' | 'quick_actions' | 'time_tracking' | 'workload';
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  notification_settings: {
    email: Record<string, boolean>;
    browser: Record<string, boolean>;
    mobile: Record<string, boolean>;
  };
  dashboard_layout: Record<string, unknown>[];
  sidebar_collapsed: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface TeamStatistics {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  total_users: number;
  total_activities: number;
}

export function useDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  // Fetch dashboard widgets
  const fetchWidgets = async () => {
    if (!user) return;

    try {
      const { data, error: queryError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_visible', true)
        .order('position_y')
        .order('position_x');

      if (queryError) throw queryError;

      const typedWidgets: DashboardWidget[] = data?.map(widget => ({
        ...widget,
        widget_type: widget.widget_type as DashboardWidget['widget_type'],
        config: widget.config as Record<string, unknown>
      })) || [];

      setWidgets(typedWidgets);
    } catch (err) {
      console.error('Error fetching widgets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch widgets');
    }
  };

  // Fetch user preferences
  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error: queryError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (queryError && queryError.code !== 'PGRST116') throw queryError;

      if (!data) {
        // Create default preferences if none exist
        const { error: createError } = await supabase.rpc('create_default_user_preferences', {
          user_uuid: user.id
        });

        if (createError) throw createError;

        // Fetch the newly created preferences
        const { data: newData, error: newQueryError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (newQueryError) throw newQueryError;
        const typedPrefs: UserPreferences = {
          ...newData,
          theme: newData.theme as UserPreferences['theme'],
          time_format: newData.time_format as UserPreferences['time_format'],
          notification_settings: newData.notification_settings as UserPreferences['notification_settings'],
          dashboard_layout: newData.dashboard_layout as UserPreferences['dashboard_layout']
        };
        setPreferences(typedPrefs);
      } else {
        const typedData: UserPreferences = {
          ...data,
          theme: data.theme as UserPreferences['theme'],
          time_format: data.time_format as UserPreferences['time_format'],
          notification_settings: data.notification_settings as UserPreferences['notification_settings'],
          dashboard_layout: data.dashboard_layout as UserPreferences['dashboard_layout']
        };
        setPreferences(typedData);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    }
  };

  // Fetch team statistics
  const fetchTeamStats = useCallback(async () => {
    if (!currentWorkspace?.id) {
      console.log('No workspace selected, skipping team stats fetch');
      setTeamStats(null);
      return;
    }

    try {
      console.log('Fetching team stats for workspace:', currentWorkspace.id);

      // Manual calculation with workspace filtering
      // Fetch projects data for current workspace
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, status')
        .eq('workspace_id', currentWorkspace.id);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Fetch tasks data for current workspace
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('workspace_id', currentWorkspace.id);

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

      // Fetch workspace members (instead of all profiles)
      const { data: workspaceMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true);

      if (membersError) {
        console.error('Error fetching workspace members:', membersError);
        throw membersError;
      }

      // Fetch activity logs data for current workspace
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('workspace_id', currentWorkspace.id);

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
        throw activitiesError;
      }

      // Calculate statistics for current workspace
      const totalProjects = Array.isArray(projects) ? projects.length : 0;
      const activeProjects = Array.isArray(projects) ? projects.filter(p => p?.status !== 'completed').length : 0;
      const totalTasks = Array.isArray(tasks) ? tasks.length : 0;
      const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t?.status === 'done').length : 0;
      const pendingTasks = Math.max(0, totalTasks - completedTasks);
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100 : 0;
      const totalUsers = Array.isArray(workspaceMembers) ? workspaceMembers.length : 0;
      const totalActivities = Array.isArray(activities) ? activities.length : 0;

      console.log('Workspace stats calculated:', {
        workspace_id: currentWorkspace.id,
        totalProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate,
        totalUsers,
        totalActivities
      });

      const stats: TeamStatistics = {
        total_projects: totalProjects,
        active_projects: activeProjects,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        completion_rate: completionRate,
        total_users: totalUsers,
        total_activities: totalActivities
      };

      setTeamStats(stats);
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team statistics');
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchWidgets(),
        fetchPreferences(),
        fetchTeamStats()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchTeamStats]);

  // Create or update widget
  const saveWidget = async (widget: Partial<DashboardWidget>) => {
    if (!user) return;

    try {
      if (widget.id) {
        // Update existing widget
        const { error } = await supabase
          .from('dashboard_widgets')
          .update({
            ...widget,
            updated_at: new Date().toISOString()
          })
          .eq('id', widget.id);

        if (error) throw error;
      } else {
        // Create new widget
        const { error } = await supabase
          .from('dashboard_widgets')
          .insert({
            ...widget,
            user_id: user.id
          });

        if (error) throw error;
      }

      await fetchWidgets();
    } catch (err) {
      console.error('Error saving widget:', err);
      throw err;
    }
  };

  // Delete widget
  const deleteWidget = async (widgetId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;

      await fetchWidgets();
    } catch (err) {
      console.error('Error deleting widget:', err);
      throw err;
    }
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = async (widgetId: string, isVisible: boolean) => {
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .update({
          is_visible: isVisible,
          updated_at: new Date().toISOString()
        })
        .eq('id', widgetId);

      if (error) throw error;

      await fetchWidgets();
    } catch (err) {
      console.error('Error toggling widget visibility:', err);
      throw err;
    }
  };

  // Update widget positions (for drag and drop)
  const updateWidgetPositions = async (updates: { id: string; position_x: number; position_y: number }[]) => {
    try {
      const promises = updates.map(update =>
        supabase
          .from('dashboard_widgets')
          .update({
            position_x: update.position_x,
            position_y: update.position_y,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
      );

      await Promise.all(promises);
      await fetchWidgets();
    } catch (err) {
      console.error('Error updating widget positions:', err);
      throw err;
    }
  };

  // Update user preferences
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchPreferences();
    } catch (err) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  };

  // Initialize default widgets for new users
  const initializeDefaultWidgets = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('create_default_dashboard_widgets', {
        user_uuid: user.id
      });

      if (error) throw error;

      await fetchWidgets();
    } catch (err) {
      console.error('Error initializing default widgets:', err);
      throw err;
    }
  };

  return {
    widgets,
    preferences,
    teamStats,
    loading,
    error,
    saveWidget,
    deleteWidget,
    toggleWidgetVisibility,
    updateWidgetPositions,
    updatePreferences,
    initializeDefaultWidgets,
    refetchWidgets: fetchWidgets,
    refetchPreferences: fetchPreferences,
    refetchTeamStats: fetchTeamStats
  };
}
