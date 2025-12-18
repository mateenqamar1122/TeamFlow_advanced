import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export interface Mention {
  id: string;
  workspace_id: string;
  mentioned_user_id: string;
  mentioner_user_id: string;
  entity_type: 'comment' | 'task' | 'project' | 'workspace' | 'calendar_event';
  entity_id: string;
  content_excerpt: string | null;
  is_read: boolean;
  context_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  mentioned_user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
  mentioner_user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export interface MentionableUser {
  id: string;
  display_name?: string;
  avatar_url?: string;
  username?: string;
  email?: string;
  role?: string;
}

interface UseMentionsProps {
  workspaceId?: string;
  enabled?: boolean;
}

export function useMentions({ workspaceId, enabled = true }: UseMentionsProps = {}) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { toast } = useToast();

  const [mentions, setMentions] = useState<Mention[]>([]);
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const activeWorkspaceId = workspaceId || currentWorkspace?.id;

  // Extract mentions from text using regex
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1].toLowerCase();
      if (username && !mentions.includes(username)) {
        mentions.push(username);
      }
    }

    return mentions;
  }, []);

  // Validate if mentioned users exist in workspace
  const validateMentions = useCallback(async (
    mentionedUsernames: string[],
    targetWorkspaceId: string
  ): Promise<MentionableUser[]> => {
    if (!mentionedUsernames.length || !targetWorkspaceId) return [];

    try {
      // Get workspace members
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', targetWorkspaceId)
        .eq('is_active', true);

      if (error || !members?.length) {
        console.error('Error fetching workspace members:', error);
        return [];
      }

      // Get profiles separately to avoid relation issues
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', members.map(m => m.user_id));

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Combine member data with profile data and filter by mentioned usernames
      const validUsers: MentionableUser[] = [];

      for (const member of members) {
        const profile = profiles?.find(p => p.id === member.user_id);
        if (profile && profile.display_name) {
          const displayName = profile.display_name.toLowerCase();
          const matchesUsername = mentionedUsernames.some(username =>
            displayName === username ||
            displayName.replace(/\s+/g, '_') === username ||
            displayName.replace(/\s+/g, '') === username
          );

          if (matchesUsername) {
            validUsers.push({
              id: member.user_id,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url || undefined,
              role: member.role,
            });
          }
        }
      }

      return validUsers;
    } catch (error) {
      console.error('Error validating mentions:', error);
      return [];
    }
  }, []);

  // Create mention records in database
  const createMentions = useCallback(async (
    mentionedUsers: MentionableUser[],
    entityType: Mention['entity_type'],
    entityId: string,
    contentExcerpt: string,
    contextUrl?: string
  ): Promise<void> => {
    if (!user || !activeWorkspaceId || !mentionedUsers.length) return;

    try {
      const mentionRecords = mentionedUsers.map(mentionedUser => ({
        workspace_id: activeWorkspaceId,
        mentioned_user_id: mentionedUser.id,
        mentioner_user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        content_excerpt: contentExcerpt.substring(0, 200), // Limit excerpt length
        context_url: contextUrl || null,
      }));

      const { error } = await supabase
        .from('mentions')
        .insert(mentionRecords);

      if (error) {
        console.error('Error creating mentions:', error);
        // If mentions table doesn't exist, log warning but don't fail
        if (error.code === 'PGRST106' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('mentions')) {
          console.warn('Mentions table not found. Mentions will not be saved until migration is run.');
        }
        return;
      }

      console.log(`Created ${mentionRecords.length} mention(s)`);
    } catch (error) {
      console.error('Error creating mentions:', error);
    }
  }, [user, activeWorkspaceId]);

  // Process mentions from text content
  const processMentions = useCallback(async (
    text: string,
    entityType: Mention['entity_type'],
    entityId: string,
    contextUrl?: string
  ): Promise<MentionableUser[]> => {
    // Early returns to prevent crashes
    if (!enabled || !activeWorkspaceId || !text?.includes('@') || !text.trim()) {
      return [];
    }

    try {
      // Extract mention usernames from text
      const mentionedUsernames = extractMentions(text);
      if (!mentionedUsernames.length) return [];

      // Validate mentioned users exist in workspace
      const validMentionedUsers = await validateMentions(mentionedUsernames, activeWorkspaceId);
      if (!validMentionedUsers.length) return validMentionedUsers;

      // Create mention records (with error handling built-in)
      await createMentions(
        validMentionedUsers,
        entityType,
        entityId,
        text.substring(0, 200), // Limit excerpt length
        contextUrl
      );

      return validMentionedUsers;
    } catch (error) {
      console.warn('Error processing mentions:', error);
      // Return empty array instead of throwing to prevent upstream failures
      return [];
    }
  }, [enabled, activeWorkspaceId, extractMentions, validateMentions, createMentions]);

  // Search for mentionable users
  const searchUsers = useCallback(async (query: string): Promise<MentionableUser[]> => {
    if (!activeWorkspaceId || !query) return [];

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          role,
          profiles!inner (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('workspace_id', activeWorkspaceId)
        .eq('is_active', true)
        .or(`profiles.display_name.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return (data || []).map(member => ({
        id: member.user_id,
        display_name: member.profiles?.display_name || undefined,
        avatar_url: member.profiles?.avatar_url || undefined,
        username: member.profiles?.display_name?.toLowerCase().replace(/\s+/g, '_') || undefined,
        role: member.role,
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, [activeWorkspaceId]);

  // Fetch user's mentions
  const fetchMentions = useCallback(async () => {
    if (!enabled || !user || !activeWorkspaceId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mentions')
        .select(`
          *,
          mentioned_user:profiles!mentioned_user_id (
            id,
            display_name,
            avatar_url
          ),
          mentioner_user:profiles!mentioner_user_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('workspace_id', activeWorkspaceId)
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching mentions:', error);
        // If mentions table doesn't exist, set empty state
        if (error.code === 'PGRST106' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('mentions')) {
          console.warn('Mentions table not found. Please run database migration.');
          setMentions([]);
          setUnreadCount(0);
          return;
        }
        return;
      }

      const typedMentions = (data || []).map(mention => ({
        ...mention,
        mentioned_user: mention.mentioned_user || undefined,
        mentioner_user: mention.mentioner_user || undefined,
      })) as Mention[];

      setMentions(typedMentions);
      setUnreadCount(typedMentions.filter(m => !m.is_read).length);
    } catch (error) {
      console.error('Error fetching mentions:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled, user, activeWorkspaceId]);

  // Mark mention as read
  const markAsRead = useCallback(async (mentionId: string) => {
    try {
      const { error } = await supabase
        .from('mentions')
        .update({ is_read: true })
        .eq('id', mentionId);

      if (error) {
        console.error('Error marking mention as read:', error);
        return;
      }

      setMentions(prev =>
        prev.map(mention =>
          mention.id === mentionId
            ? { ...mention, is_read: true }
            : mention
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking mention as read:', error);
    }
  }, []);

  // Mark all mentions as read
  const markAllAsRead = useCallback(async () => {
    if (!user || !activeWorkspaceId) return;

    try {
      const { error } = await supabase
        .from('mentions')
        .update({ is_read: true })
        .eq('workspace_id', activeWorkspaceId)
        .eq('mentioned_user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all mentions as read:', error);
        return;
      }

      setMentions(prev =>
        prev.map(mention => ({ ...mention, is_read: true }))
      );

      setUnreadCount(0);

      toast({
        title: "Mentions cleared",
        description: "All mentions marked as read",
      });
    } catch (error) {
      console.error('Error marking all mentions as read:', error);
    }
  }, [user, activeWorkspaceId, toast]);

  // Delete mention
  const deleteMention = useCallback(async (mentionId: string) => {
    try {
      const { error } = await supabase
        .from('mentions')
        .delete()
        .eq('id', mentionId);

      if (error) {
        console.error('Error deleting mention:', error);
        return;
      }

      setMentions(prev => {
        const wasUnread = prev.find(m => m.id === mentionId)?.is_read === false;
        if (wasUnread) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        return prev.filter(mention => mention.id !== mentionId);
      });

      toast({
        title: "Mention deleted",
        description: "Mention removed successfully",
      });
    } catch (error) {
      console.error('Error deleting mention:', error);
    }
  }, [toast]);

  // Fetch mentionable users for workspace
  const fetchMentionableUsers = useCallback(async () => {
    if (!activeWorkspaceId) return;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          role,
          profiles!inner (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('workspace_id', activeWorkspaceId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching mentionable users:', error);
        return;
      }

      const users = (data || []).map(member => ({
        id: member.user_id,
        display_name: member.profiles?.display_name || undefined,
        avatar_url: member.profiles?.avatar_url || undefined,
        username: member.profiles?.display_name?.toLowerCase().replace(/\s+/g, '_') || undefined,
        role: member.role,
      }));

      setMentionableUsers(users);
    } catch (error) {
      console.error('Error fetching mentionable users:', error);
    }
  }, [activeWorkspaceId]);

  // Subscribe to realtime mentions
  useEffect(() => {
    if (!enabled || !user || !activeWorkspaceId) return;

    const channel = supabase
      .channel(`mentions:${activeWorkspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentions',
          filter: `mentioned_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Mention realtime update:', payload);
          fetchMentions(); // Refetch mentions on any change
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [enabled, user, activeWorkspaceId, fetchMentions]);

  // Load initial data
  useEffect(() => {
    if (enabled && activeWorkspaceId) {
      fetchMentions();
      fetchMentionableUsers();
    }
  }, [enabled, activeWorkspaceId, fetchMentions, fetchMentionableUsers]);

  return useMemo(() => ({
    mentions,
    mentionableUsers,
    loading,
    searchLoading,
    unreadCount,
    extractMentions,
    processMentions,
    searchUsers,
    markAsRead,
    markAllAsRead,
    deleteMention,
    fetchMentions,
    fetchMentionableUsers,
  }), [
    mentions,
    mentionableUsers,
    loading,
    searchLoading,
    unreadCount,
    extractMentions,
    processMentions,
    searchUsers,
    markAsRead,
    markAllAsRead,
    deleteMention,
    fetchMentions,
    fetchMentionableUsers,
  ]);
}
