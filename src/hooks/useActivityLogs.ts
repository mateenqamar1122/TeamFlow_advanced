import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: 'create' | 'update' | 'delete' | 'assign' | 'unassign' | 'comment' |
              'status_change' | 'tag_add' | 'tag_remove' | 'member_add' | 'member_remove' |
              'file_upload' | 'file_delete' | 'mention' | 'reaction' | 'login' | 'logout';
  entity_type: 'task' | 'project' | 'comment' | 'user' | 'tag' | 'file' | 'team';
  entity_id: string | null;
  entity_name: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown>;
  description: string | null;
  created_at: string;
  user_name: string | null;
  user_avatar: string | null;
  target_user_name: string | null;
}

export interface ActivityFilters {
  action_types?: string[];
  entity_types?: string[];
  user_ids?: string[];
  date_from?: Date;
  date_to?: Date;
  limit?: number;
}

export function useActivityLogs(filters: ActivityFilters = {}) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  const fetchActivities = useCallback(async () => {
    if (!user || !currentWorkspace) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching activities for workspace:', currentWorkspace.id);

      // Query activity_logs filtered by workspace
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.action_types?.length) {
        query = query.in('action_type', filters.action_types);
      }

      if (filters.entity_types?.length) {
        query = query.in('entity_type', filters.entity_types);
      }

      if (filters.user_ids?.length) {
        query = query.in('user_id', filters.user_ids);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from.toISOString());
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to.toISOString());
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(50);
      }

      const { data: activityData, error: queryError } = await query;

      if (queryError) throw queryError;

      // Get user information separately to avoid permission issues
      const userIds = [...new Set([
        ...activityData?.map(a => a.user_id) || [],
        ...activityData?.map(a => a.target_user_id).filter(Boolean) || []
      ])];

      let userProfiles: Record<string, { display_name?: string; avatar_url?: string }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds);

        if (profiles) {
          userProfiles = profiles.reduce((acc, profile) => ({
            ...acc,
            [profile.id]: profile
          }), {});
        }
      }

      // Map the activity data with user information
      const activitiesWithUserInfo: ActivityLog[] = activityData?.map(activity => ({
        ...activity,
        action_type: activity.action_type as ActivityLog['action_type'],
        entity_type: activity.entity_type as ActivityLog['entity_type'],
        metadata: activity.metadata as Record<string, unknown>,
        user_name: userProfiles[activity.user_id]?.display_name || null,
        user_avatar: userProfiles[activity.user_id]?.avatar_url || null,
        target_user_name: activity.target_user_id ? userProfiles[activity.target_user_id]?.display_name || null : null
      })) || [];

      setActivities(activitiesWithUserInfo);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace, filters.action_types, filters.entity_types, filters.user_ids, filters.date_from, filters.date_to, filters.limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Real-time subscription for new activities
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (_payload) => {
          // Refresh activities when new activity is logged
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActivities]);

  const logActivity = async (
    actionType: ActivityLog['action_type'],
    entityType: ActivityLog['entity_type'],
    entityId?: string,
    entityName?: string,
    targetUserId?: string,
    metadata: Record<string, unknown> = {},
    description?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: actionType,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_entity_name: entityName || null,
        p_target_user_id: targetUserId || null,
        p_metadata: metadata,
        p_description: description || null
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  const getActivityIcon = (actionType: ActivityLog['action_type']) => {
    const iconMap = {
      create: 'Plus',
      update: 'Edit',
      delete: 'Trash2',
      assign: 'UserPlus',
      unassign: 'UserMinus',
      comment: 'MessageCircle',
      status_change: 'ArrowRight',
      tag_add: 'Tag',
      tag_remove: 'Tag',
      member_add: 'Users',
      member_remove: 'UserX',
      file_upload: 'Upload',
      file_delete: 'FileX',
      mention: 'AtSign',
      reaction: 'Heart',
      login: 'LogIn',
      logout: 'LogOut'
    };
    return iconMap[actionType] || 'Activity';
  };

  const getActivityColor = (actionType: ActivityLog['action_type']) => {
    const colorMap = {
      create: 'text-green-600',
      update: 'text-blue-600',
      delete: 'text-red-600',
      assign: 'text-purple-600',
      unassign: 'text-gray-600',
      comment: 'text-indigo-600',
      status_change: 'text-orange-600',
      tag_add: 'text-teal-600',
      tag_remove: 'text-pink-600',
      member_add: 'text-emerald-600',
      member_remove: 'text-rose-600',
      file_upload: 'text-cyan-600',
      file_delete: 'text-red-500',
      mention: 'text-yellow-600',
      reaction: 'text-pink-500',
      login: 'text-blue-500',
      logout: 'text-gray-500'
    };
    return colorMap[actionType] || 'text-gray-600';
  };

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    logActivity,
    getActivityIcon,
    getActivityColor
  };
}
