import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
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
  parent_comment_id?: string;
  thread_level: number;
  is_edited: boolean;
  is_deleted: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
  mentions?: string[] | null;
  attachments?: string[] | null;
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

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  workspace_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface CommentAttachment {
  id: string;
  comment_id: string;
  workspace_id: string;
  filename: string;
  file_size?: number;
  mime_type?: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
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
      // First, check if the comments table exists by doing a simple query
      const commentsResult = await (supabase as any)
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      const { data: commentsData, error: commentsError } = commentsResult;

      if (commentsError) {
        // Check if the error is because the table doesn't exist or columns don't exist
        if (
          commentsError.code === 'PGRST106' ||
          commentsError.code === '42P01' || // relation does not exist
          commentsError.code === '42703' || // column does not exist
          commentsError.message?.includes('relation') ||
          commentsError.message?.includes('does not exist') ||
          commentsError.message?.includes('column')
        ) {
          console.warn('Comments table does not exist or is missing columns. Using fallback.');
          console.warn('Error details:', commentsError);
          console.warn('To fix this, please run the create_comments_table.sql script in your Supabase database.');
          setComments([]);
          setError('Comments feature not available. Database migration needed.');
          return;
        }
        throw commentsError;
      }

      // Fetch author profiles separately (since comments.author_id references auth.users)
      const authorIds = [...new Set(commentsData?.map((c: any) => c.author_id) || [])].filter(id => id) as string[];
      let authorProfiles: Record<string, { display_name?: string; avatar_url?: string }> = {};

      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', authorIds);

        if (profilesData) {
          authorProfiles = profilesData.reduce((acc, profile) => ({
            ...acc,
            [profile.id]: {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url
            }
          }), {});
        }
      }

      // Fetch reactions for these comments (with error handling for missing table)
      const commentIds = commentsData?.map((c: any) => c.id) || [];
      let userReactions: Record<string, ReactionType> = {};
      let reactionCounts: Record<string, Record<ReactionType, number>> = {};

      if (commentIds.length > 0) {
        try {
          // Get user's reactions
          if (user) {
            const { data: userReactionsData, error: userReactionsError } = await (supabase as any)
              .from('comment_reactions')
              .select('comment_id, reaction_type')
              .in('comment_id', commentIds)
              .eq('user_id', user.id);

            if (!userReactionsError && userReactionsData) {
              userReactions = userReactionsData.reduce((acc: any, reaction: any) => {
                acc[reaction.comment_id] = reaction.reaction_type;
                return acc;
              }, {});
            } else if (userReactionsError) {
              console.warn('comment_reactions table not available:', userReactionsError.message);
            }
          }

          // Get all reaction counts
          const { data: allReactionsData, error: allReactionsError } = await (supabase as any)
            .from('comment_reactions')
            .select('comment_id, reaction_type')
            .in('comment_id', commentIds);

          if (!allReactionsError && allReactionsData) {
            // Count reactions by type for each comment
            reactionCounts = allReactionsData.reduce((acc: any, reaction: any) => {
              if (!acc[reaction.comment_id]) {
                acc[reaction.comment_id] = {
                  like: 0,
                  love: 0,
                  laugh: 0,
                  thumbs_up: 0,
                  thumbs_down: 0,
                  confused: 0,
                  heart: 0
                };
              }
              acc[reaction.comment_id][reaction.reaction_type as ReactionType]++;
              return acc;
            }, {} as Record<string, Record<ReactionType, number>>) || {};
          } else if (allReactionsError) {
            console.warn('comment_reactions table not available:', allReactionsError.message);
          }
        } catch (reactionsErr) {
          console.warn('Reactions functionality not available - comment_reactions table may not exist');
        }
      }

      // Format comments with reactions and author data
      const formattedComments: Comment[] = (commentsData || []).map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        author_id: comment.author_id,
        workspace_id: comment.workspace_id,
        entity_type: comment.entity_type as CommentEntity,
        entity_id: comment.entity_id,
        parent_comment_id: comment.parent_id, // Database uses parent_id, interface uses parent_comment_id
        thread_level: comment.thread_level || 0,
        is_edited: comment.is_edited || false,
        is_deleted: comment.is_deleted || false,
        edited_at: comment.edited_at,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        mentions: Array.isArray(comment.mentions) ? comment.mentions : null,
        attachments: comment.attachments,
        author: authorProfiles[comment.author_id] ? {
          id: comment.author_id,
          display_name: authorProfiles[comment.author_id].display_name,
          avatar_url: authorProfiles[comment.author_id].avatar_url
        } : {
          id: comment.author_id,
          display_name: 'Unknown User',
          avatar_url: undefined
        },
        reactions: reactionCounts[comment.id] || {
          like: 0,
          love: 0,
          laugh: 0,
          thumbs_up: 0,
          thumbs_down: 0,
          confused: 0,
          heart: 0
        },
        user_reaction: userReactions[comment.id],
        replies: []
      }));

      // Build comment tree structure
      const commentTree = buildCommentTree(formattedComments);
      setComments(commentTree);

    } catch (err) {
      console.error('Error fetching comments:', err);
      console.error('Error details:', {
        entityType,
        entityId,
        workspaceId,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorCode: (err as { code?: string })?.code,
        errorDetails: (err as { details?: string })?.details
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, workspaceId, enabled, user]);

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
      // TODO: Re-enable reaction changes listener once comment_reactions table is set up
      // .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_reactions' }, handleReactionChange)
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        handleTypingUpdate(payload);
      })
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [entityType, entityId, workspaceId, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchComments();
      const unsubscribe = subscribeToRealtime();
      return unsubscribe;
    }
  }, [fetchComments, subscribeToRealtime, enabled]);

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

      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const handleRealtimeChange = async (payload: {
    eventType: string;
    new: any;
    old: any;
  }) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT': {
        // Fetch the new comment without joins
        const { data: newComment } = await supabase
          .from('comments')
          .select('*')
          .eq('id', newRecord.id)
          .single() as { data: any; error: any };

        if (newComment) {
          // Fetch author profile separately
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', newComment.author_id)
            .single();

          const formattedComment: Comment = {
            id: newComment.id,
            content: newComment.content,
            author_id: newComment.author_id,
            workspace_id: newComment.workspace_id,
            entity_type: newComment.entity_type as CommentEntity,
            entity_id: newComment.entity_id,
            parent_comment_id: newComment.parent_id, // Database uses parent_id
            thread_level: newComment.thread_level || 0,
            is_edited: newComment.is_edited || false,
            is_deleted: newComment.is_deleted || false,
            edited_at: newComment.edited_at,
            created_at: newComment.created_at,
            updated_at: newComment.updated_at,
            mentions: Array.isArray(newComment.mentions) ? newComment.mentions : null,
            attachments: newComment.attachments,
            author: authorProfile ? {
              id: authorProfile.id,
              display_name: authorProfile.display_name,
              avatar_url: authorProfile.avatar_url
            } : {
              id: newComment.author_id,
              display_name: 'Unknown User',
              avatar_url: undefined
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

          setComments(prev => {
            const updated = [...prev];
            if (formattedComment.parent_comment_id) {
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

  // Removed handleReactionChange since reactions are not implemented yet

  const handleTypingUpdate = (payload: {
    payload: { user_id: string; display_name: string; is_typing: boolean };
  }) => {
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

  const addComment = async (content: string, parentId?: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const threadLevel = parentId ?
        (findCommentInTree(comments, parentId)?.thread_level || 0) + 1 : 0;

      // Fix: Use correct column names from database
      const insertData = {
        content: content.trim(),
        author_id: user.id,
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: entityId,
        ...(parentId && { parent_id: parentId }), // Fixed: parent_id not parent_comment_id
        ...(parentId && { thread_level: Math.min(threadLevel, 5) }),
        mentions: extractMentions(content) // Store as PostgreSQL array
      };



      const { error } = await (supabase as any)
        .from('comments')
        .insert(insertData)
        .select()
        .single();


      if (error) {
        console.error('Database error when adding comment:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          insertData
        });

        // Check if the error is because the table doesn't exist
        if (
          error.code === 'PGRST106' ||
          error.code === '42P01' || // relation does not exist
          error.code === '42703' || // column does not exist
          error.message?.includes('relation') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('column')
        ) {
          toast({
            title: "Database Error",
            description: `Column or table issue: ${error.message}. Check database schema.`,
            variant: "destructive"
          });
          return false;
        }

        // For other errors, show the actual error message
        toast({
          title: "Error adding comment",
          description: error.message || "Failed to add comment",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully."
      });

      return true;
    } catch (err) {
      console.error('Error adding comment:', err);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateComment = async (commentId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    try {
      const { error } = await (supabase as any)
        .from('comments')
        .update({
          content: content.trim(),
          mentions: extractMentions(content), // Store as PostgreSQL array
          is_edited: true
        })
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;

      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully."
      });

      return true;
    } catch (err) {
      console.error('Error updating comment:', err);
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Soft delete to preserve thread structure
      const { error } = await (supabase as any)
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('author_id', user.id);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted."
      });

      return true;
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
      return false;
    }
  };

  const addReaction = async (commentId: string, reactionType: ReactionType): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add reactions",
        variant: "destructive"
      });
      return false;
    }

    try {
      // First, get the comment to verify it exists and get workspace info
      const { data: commentData, error: commentError } = await (supabase as any)
        .from('comments')
        .select('id, workspace_id')
        .eq('id', commentId)
        .single();

      if (commentError || !commentData) {
        console.error('Comment not found:', commentError);
        toast({
          title: "Comment not found",
          description: "Unable to find the comment to react to",
          variant: "destructive"
        });
        return false;
      }

      // Verify user has access to this workspace
      const { data: membershipData, error: membershipError } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', commentData.workspace_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (membershipError || !membershipData) {
        console.error('User not a member of workspace:', membershipError);
        toast({
          title: "Access denied",
          description: "You don't have permission to react to comments in this workspace",
          variant: "destructive"
        });
        return false;
      }

      // Remove existing reaction first (if any)
      await (supabase as any)
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      // Add new reaction
      const { error } = await (supabase as any)
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
          workspace_id: commentData.workspace_id // Include required workspace_id
        });

      if (error) {
        console.error('Error adding reaction:', error);

        // Provide specific error messages based on error codes
        let errorMessage = "Failed to add reaction";
        if (error.code === '42501') {
          errorMessage = "You don't have permission to add reactions in this workspace";
        } else if (error.code === '23505') {
          errorMessage = "You've already reacted with this emoji";
        }

        toast({
          title: "Error adding reaction",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }

      // Refresh comments to show updated reactions
      await fetchComments();
      return true;
    } catch (err) {
      console.error('Error adding reaction:', err);
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive"
      });
      return false;
    }
  };

  const removeReaction = async (commentId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to remove reactions",
        variant: "destructive"
      });
      return false;
    }

    try {
      // First, get the comment to verify it exists and get workspace info
      const { data: commentData, error: commentError } = await (supabase as any)
        .from('comments')
        .select('id, workspace_id')
        .eq('id', commentId)
        .single();

      if (commentError || !commentData) {
        console.error('Comment not found:', commentError);
        toast({
          title: "Comment not found",
          description: "Unable to find the comment",
          variant: "destructive"
        });
        return false;
      }

      // Verify user has access to this workspace
      const { data: membershipData, error: membershipError } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', commentData.workspace_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (membershipError || !membershipData) {
        console.error('User not a member of workspace:', membershipError);
        toast({
          title: "Access denied",
          description: "You don't have permission to modify reactions in this workspace",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await (supabase as any)
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing reaction:', error);

        let errorMessage = "Failed to remove reaction";
        if (error.code === '42501') {
          errorMessage = "You don't have permission to remove reactions in this workspace";
        }

        toast({
          title: "Error removing reaction",
          description: errorMessage,
          variant: "destructive"
        });
        return false;
      }

      // Refresh comments to show updated reactions
      await fetchComments();
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      toast({
        title: "Error",
        description: "Failed to remove reaction",
        variant: "destructive"
      });
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
  const addReplyToTree = (comments: Comment[], reply: Comment) => {
    for (const comment of comments) {
      if (comment.id === reply.parent_comment_id) {
        comment.replies = comment.replies || [];
        comment.replies.push(reply);
        return;
      }
      if (comment.replies && comment.replies.length > 0) {
        addReplyToTree(comment.replies, reply);
      }
    }
  };

  const updateCommentInTree = (comments: Comment[], updatedData: Partial<Comment>): Comment[] => {
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
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, is_deleted: true, content: '[Comment deleted]' };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: removeCommentFromTree(comment.replies, commentId)
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
