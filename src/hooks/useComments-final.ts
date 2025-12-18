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

      // Fetch comments
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

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get author IDs and comment IDs
      const authorIds = [...new Set(commentsData.map((c: any) => c.author_id))];
      const commentIds = commentsData.map((c: any) => c.id);

      // Fetch author profiles
      let authorsMap: Record<string, any> = {};
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, email')
          .in('id', authorIds);

        authorsMap = (profilesData || []).reduce((acc: any, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      } catch (profilesError) {
        console.warn('Could not fetch profiles:', profilesError);
      }

      // Fetch reactions
      let reactionCounts: Record<string, Record<ReactionType, number>> = {};
      let userReactions: Record<string, ReactionType> = {};

      try {
        const { data: reactionsData } = await supabase
          .from('comment_reactions')
          .select('comment_id, reaction_type, user_id')
          .in('comment_id', commentIds);

        if (reactionsData) {
          // Count reactions
          reactionCounts = reactionsData.reduce((acc: any, reaction: any) => {
            if (!acc[reaction.comment_id]) {
              acc[reaction.comment_id] = {
                like: 0, love: 0, laugh: 0, thumbs_up: 0,
                thumbs_down: 0, confused: 0, heart: 0
              };
            }
            acc[reaction.comment_id][reaction.reaction_type]++;
            return acc;
          }, {});

          // Get user's reactions
          if (user) {
            userReactions = reactionsData
              .filter((r: any) => r.user_id === user.id)
              .reduce((acc: any, r: any) => {
                acc[r.comment_id] = r.reaction_type;
                return acc;
              }, {});
          }
        }
      } catch (reactionsError) {
        console.warn('Could not fetch reactions:', reactionsError);
      }

      // Format comments
      const formattedComments: Comment[] = commentsData.map((comment: any) => {
        const authorProfile = authorsMap[comment.author_id];

        return {
          id: comment.id,
          content: comment.content,
          author_id: comment.author_id,
          workspace_id: comment.workspace_id,
          entity_type: comment.entity_type,
          entity_id: comment.entity_id,
          parent_id: comment.parent_id,
          thread_level: comment.thread_level || 0,
          is_edited: comment.is_edited || false,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          mentions: comment.mentions || [],
          author: authorProfile ? {
            id: authorProfile.id,
            display_name: authorProfile.display_name || authorProfile.email || 'User',
            avatar_url: authorProfile.avatar_url
          } : {
            id: comment.author_id,
            display_name: 'User',
            avatar_url: null
          },
          reactions: reactionCounts[comment.id] || {
            like: 0, love: 0, laugh: 0, thumbs_up: 0,
            thumbs_down: 0, confused: 0, heart: 0
          },
          user_reaction: userReactions[comment.id],
          replies: []
        };
      });

      // Build comment tree
      const commentTree = buildCommentTree(formattedComments);
      setComments(commentTree);

    } catch (err: any) {
      console.error('Error fetching comments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(errorMessage);
      toast.error('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, workspaceId, enabled]);

  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // Create map
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Build tree
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `entity_id=eq.${entityId}`
      }, (payload) => {
        console.log('Comment change:', payload);
        handleRealtimeChange(payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comment_reactions'
      }, (payload) => {
        console.log('Reaction change:', payload);
        handleReactionChange(payload);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        handleTypingUpdate(payload);
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [entityType, entityId, workspaceId, enabled]);

  const handleRealtimeChange = async (payload: any) => {
    const { eventType } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
      // Refetch comments to get latest data
      fetchComments();
    }
  };

  const handleReactionChange = async (payload: any) => {
    const { new: newRecord, old: oldRecord } = payload;
    const commentId = newRecord?.comment_id || oldRecord?.comment_id;

    if (commentId) {
      await refreshCommentReactions(commentId);
    }
  };

  const handleTypingUpdate = (payload: any) => {
    const { user_id, display_name, is_typing } = payload.payload;
    if (user_id === user?.id) return;

    setTyping(prev => {
      const updated = { ...prev };
      if (is_typing) {
        updated[user_id] = display_name || 'Someone';
        if (typingTimeoutRef.current[user_id]) {
          clearTimeout(typingTimeoutRef.current[user_id]);
        }
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

  const refreshCommentReactions = async (commentId: string) => {
    try {
      const { data: reactionsData } = await supabase
        .from('comment_reactions')
        .select('reaction_type, user_id')
        .eq('comment_id', commentId);

      const reactionCounts: Record<ReactionType, number> = {
        like: 0, love: 0, laugh: 0, thumbs_up: 0,
        thumbs_down: 0, confused: 0, heart: 0
      };

      let userReaction: ReactionType | undefined;

      reactionsData?.forEach((reaction: any) => {
        reactionCounts[reaction.reaction_type as ReactionType]++;
        if (reaction.user_id === user?.id) {
          userReaction = reaction.reaction_type;
        }
      });

      setComments(prev => updateCommentReactions(prev, commentId, reactionCounts, userReaction));
    } catch (err) {
      console.error('Error refreshing reactions:', err);
    }
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

      const { error } = await supabase
        .from('comments')
        .insert({
          content: content.trim(),
          author_id: user.id,
          workspace_id: workspaceId,
          entity_type: entityType,
          entity_id: entityId,
          parent_id: parentId,
          thread_level: Math.min(threadLevel, 5),
          mentions: extractMentions(content)
        });

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

  const addReaction = async (commentId: string, reactionType: ReactionType): Promise<boolean> => {
    if (!user) return false;

    try {
      // Remove existing reaction first
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      // Add new reaction
      const { error } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          workspace_id: workspaceId,
          reaction_type: reactionType
        });

      if (error) throw error;

      // Optimistic update
      setComments(prev => updateCommentReaction(prev, commentId, reactionType, 'add'));

      toast.success("Reaction added!");
      return true;
    } catch (err) {
      console.error('Error adding reaction:', err);
      toast.error("Failed to add reaction");
      return false;
    }
  };

  const removeReaction = async (commentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Optimistic update
      setComments(prev => updateCommentReaction(prev, commentId, undefined, 'remove'));

      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      toast.error("Failed to remove reaction");
      return false;
    }
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
  const updateCommentReaction = (
    comments: Comment[],
    commentId: string,
    reactionType: ReactionType | undefined,
    action: 'add' | 'remove'
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        const newReactions = { ...comment.reactions };
        const oldUserReaction = comment.user_reaction;

        if (action === 'add' && reactionType) {
          if (oldUserReaction) {
            newReactions[oldUserReaction] = Math.max(0, newReactions[oldUserReaction] - 1);
          }
          newReactions[reactionType]++;
          return { ...comment, reactions: newReactions, user_reaction: reactionType };
        } else if (action === 'remove' && oldUserReaction) {
          newReactions[oldUserReaction] = Math.max(0, newReactions[oldUserReaction] - 1);
          return { ...comment, reactions: newReactions, user_reaction: undefined };
        }
      }

      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentReaction(comment.replies, commentId, reactionType, action)
        };
      }
      return comment;
    });
  };

  const updateCommentReactions = (
    comments: Comment[],
    commentId: string,
    reactions: Record<ReactionType, number>,
    userReaction?: ReactionType
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, reactions, user_reaction: userReaction };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentReactions(comment.replies, commentId, reactions, userReaction)
        };
      }
      return comment;
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
