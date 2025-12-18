import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CommentEntity = 'task' | 'project' | 'workspace' | 'calendar_event';
export type ReactionType = 'like' | 'love' | 'laugh' | 'thumbs_up' | 'thumbs_down' | 'confused' | 'heart';

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  workspace_id: string;
  entity_type: CommentEntity;
  entity_id: string;
  parent_id?: string;
  thread_level: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  mentions: string[];
  reactions: Record<ReactionType, number>;

  // Joined data
  author?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  user_reaction?: ReactionType;
}

interface UseCommentsProps {
  entityType: CommentEntity;
  entityId: string;
  workspaceId: string;
  enabled?: boolean;
}

export function useComments({ entityType, entityId, workspaceId, enabled = true }: UseCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, string>>({});

  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchComments = useCallback(async () => {
    if (!enabled || !entityId || !workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching comments for:', { entityType, entityId, workspaceId });

      // Fetch comments without joins to avoid foreign key issues
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Comments query error:', commentsError);
        throw new Error(commentsError.message);
      }

      console.log('Comments fetched:', commentsData?.length || 0);

      // If no comments, return early
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get unique author IDs
      const authorIds = [...new Set(commentsData.map(c => c.author_id))];

      // Try to fetch author profiles separately
      let authorsData: any[] = [];
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, email')
          .in('id', authorIds);

        authorsData = profilesData || [];
      } catch (profilesError) {
        console.warn('Could not fetch profiles, using fallback author data:', profilesError);
        // Create fallback author data
        authorsData = authorIds.map(id => ({
          id,
          display_name: 'User',
          avatar_url: null,
          email: 'user@example.com'
        }));
      }

      // Format comments with author data (simplified without reactions for now)
      const formattedComments: Comment[] = commentsData.map(comment => {
        const authorProfile = authorsData.find(author => author.id === comment.author_id);

        return {
          ...comment,
          author: authorProfile ? {
            id: authorProfile.id,
            display_name: authorProfile.display_name || authorProfile.email || 'User',
            avatar_url: authorProfile.avatar_url
          } : {
            id: comment.author_id,
            display_name: 'User',
            avatar_url: null
          },
          reactions: {
            like: 0,
            love: 0,
            laugh: 0,
            thumbs_up: 0,
            thumbs_down: 0,
            confused: 0,
            heart: 0
          },
          user_reaction: undefined,
          replies: []
        };
      });

      // Build comment tree structure
      const commentTree = buildCommentTree(formattedComments);
      setComments(commentTree);

    } catch (err) {
      console.error('Error fetching comments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(errorMessage);

      // Show user-friendly error message
      if (errorMessage.includes('PGRST200') || errorMessage.includes('relationship')) {
        toast.error('Database configuration issue. Please contact your administrator.');
      } else {
        toast.error('Failed to load comments. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, workspaceId, enabled, user]);

  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map and initialize replies arrays
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const subscribeToRealtime = useCallback(() => {
    if (!enabled || !entityId || !workspaceId) return;

    const channelName = `comments:${entityType}:${entityId}`;

    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`
        },
        (payload) => {
          console.log('Comment change:', payload);
          handleRealtimeChange(payload);
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        handleTypingUpdate(payload);
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [entityType, entityId, workspaceId, enabled]);

  const handleRealtimeChange = async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT': {
        // Fetch the new comment
        const { data: newComment } = await supabase
          .from('comments')
          .select('*')
          .eq('id', newRecord.id)
          .single();

        if (newComment) {
          // Try to fetch author profile
          let authorProfile = null;
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url, email')
              .eq('id', newComment.author_id)
              .single();

            authorProfile = profileData;
          } catch (profileError) {
            console.warn('Could not fetch profile for new comment:', profileError);
          }

          const formattedComment: Comment = {
            ...newComment,
            author: authorProfile ? {
              id: authorProfile.id,
              display_name: authorProfile.display_name || authorProfile.email || 'User',
              avatar_url: authorProfile.avatar_url
            } : {
              id: newComment.author_id,
              display_name: 'User',
              avatar_url: null
            },
            reactions: {
              like: 0,
              love: 0,
              laugh: 0,
              thumbs_up: 0,
              thumbs_down: 0,
              confused: 0,
              heart: 0
            },
            replies: []
          };

          setComments(prev => {
            const updated = [...prev];
            if (formattedComment.parent_id) {
              // Add as reply
              addReplyToTree(updated, formattedComment);
            } else {
              // Add as root comment
              updated.push(formattedComment);
            }
            return updated;
          });
        }
        break;
      }
      case 'UPDATE':
        setComments(prev => updateCommentInTree(prev, newRecord));
        break;
      case 'DELETE':
        setComments(prev => removeCommentFromTree(prev, oldRecord.id));
        break;
    }
  };

  const handleTypingUpdate = (payload: any) => {
    const { user_id, display_name, is_typing } = payload.payload;

    if (user_id === user?.id) return; // Ignore own typing

    setTyping(prev => {
      const updated = { ...prev };

      if (is_typing) {
        updated[user_id] = display_name || 'Someone';

        // Clear existing timeout
        if (typingTimeoutRef.current[user_id]) {
          clearTimeout(typingTimeoutRef.current[user_id]);
        }

        // Set timeout to clear typing status
        typingTimeoutRef.current[user_id] = setTimeout(() => {
          setTyping(prev => {
            const updated = { ...prev };
            delete updated[user_id];
            return updated;
          });
          delete typingTimeoutRef.current[user_id];
        }, 3000);
      } else {
        delete updated[user_id];
        if (typingTimeoutRef.current[user_id]) {
          clearTimeout(typingTimeoutRef.current[user_id]);
          delete typingTimeoutRef.current[user_id];
        }
      }

      return updated;
    });
  };

  useEffect(() => {
    if (enabled) {
      fetchComments();
      const unsubscribe = subscribeToRealtime();
      return unsubscribe;
    }
  }, [fetchComments, subscribeToRealtime, enabled]);

  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const threadLevel = parentId ?
        (findCommentInTree(comments, parentId)?.thread_level || 0) + 1 : 0;

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          content: content.trim(),
          author_id: user.id,
          workspace_id: workspaceId,
          entity_type: entityType,
          entity_id: entityId,
          parent_id: parentId,
          thread_level: Math.min(threadLevel, 5), // Max 5 levels deep
          mentions: extractMentions(content)
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Comment posted successfully!");
      return true;
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error("Failed to post comment");
      return false;
    }
  };

  const updateComment = async (commentId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: content.trim(),
          mentions: extractMentions(content),
          is_edited: true
        })
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;

      toast.success("Comment updated successfully!");
      return true;
    } catch (err) {
      console.error('Error updating comment:', err);
      toast.error("Failed to update comment");
      return false;
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Hard delete since we don't have is_deleted column
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;

      toast.success("Comment deleted successfully!");
      return true;
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error("Failed to delete comment");
      return false;
    }
  };

  // Simplified reaction functions (will return true but not actually do anything until DB is set up)
  const addReaction = async (commentId: string, reactionType: ReactionType): Promise<boolean> => {
    console.log('Reaction feature not yet available:', { commentId, reactionType });
    toast.info('Reactions feature coming soon!');
    return true;
  };

  const removeReaction = async (commentId: string): Promise<boolean> => {
    console.log('Remove reaction not yet available:', commentId);
    return true;
  };

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !user) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        display_name: user.user_metadata?.display_name || user.email,
        is_typing: isTyping
      }
    });
  }, [user]);

  // Helper functions
  const addReplyToTree = (comments: Comment[], reply: Comment) => {
    for (const comment of comments) {
      if (comment.id === reply.parent_id) {
        comment.replies = comment.replies || [];
        comment.replies.push(reply);
        return;
      }
      if (comment.replies && comment.replies.length > 0) {
        addReplyToTree(comment.replies, reply);
      }
    }
  };

  const updateCommentInTree = (comments: Comment[], updatedData: any): Comment[] => {
    return comments.map(comment => {
      if (comment.id === updatedData.id) {
        return { ...comment, ...updatedData };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, updatedData)
        };
      }
      return comment;
    });
  };

  const removeCommentFromTree = (comments: Comment[], commentId: string): Comment[] => {
    return comments.filter(comment => {
      if (comment.id === commentId) {
        return false; // Remove the comment
      }
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = removeCommentFromTree(comment.replies, commentId);
      }
      return true;
    });
  };

  const findCommentInTree = (comments: Comment[], commentId: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === commentId) {
        return comment;
      }
      if (comment.replies && comment.replies.length > 0) {
        const found = findCommentInTree(comment.replies, commentId);
        if (found) return found;
      }
    }
    return null;
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  return {
    comments,
    loading,
    error,
    typing: Object.values(typing),
    addComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    broadcastTyping,
    refetch: fetchComments
  };
}
