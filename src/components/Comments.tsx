import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Send,
  Reply,
  Edit,
  Trash2,
  Smile,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useComments, type Comment, type CommentEntity, type ReactionType } from '@/hooks/useComments';
import { useMentions } from '@/hooks/useMentions';
import MentionInput from './MentionInput';
import MentionText from './MentionText';
import { formatDistanceToNow } from 'date-fns';

interface CommentsProps {
  entityType: CommentEntity;
  entityId: string;
  workspaceId: string;
  title?: string;
  placeholder?: string;
  maxHeight?: string;
  showTitle?: boolean;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'laugh', emoji: '😂', label: 'Laugh' },
  { type: 'thumbs_up', emoji: '👍', label: 'Thumbs Up' },
  { type: 'heart', emoji: '💖', label: 'Heart' },
  { type: 'thumbs_down', emoji: '👎', label: 'Thumbs Down' },
  { type: 'confused', emoji: '😕', label: 'Confused' },
];

export function Comments({
  entityType,
  entityId,
  workspaceId,
  title = 'Comments',
  placeholder = 'Add a comment...',
  maxHeight = '500px',
  showTitle = true
}: CommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();



  const {
    comments,
    loading,
    error,
    typing,
    addComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    broadcastTyping
  } = useComments({
    entityType,
    entityId,
    workspaceId,
    enabled: !!entityId && !!workspaceId
  });

  const { processMentions } = useMentions({ workspaceId });

  const handleSubmitComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;

    const success = await addComment(content, parentId);
    if (success) {
      // Process mentions after successful comment creation
      if (processMentions && content.includes('@')) {
        try {
          await processMentions(
            content,
            'comment',
            entityId,
            window.location.href // Context URL for navigation
          );
        } catch (mentionError) {
          console.warn('Error processing mentions:', mentionError);
          // Don't fail comment creation due to mention processing issues
        }
      }

      if (parentId) {
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      broadcastTyping(false);
      setIsTyping(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    const success = await updateComment(commentId, content);
    if (success) {
      // Process mentions after successful comment edit
      if (processMentions && content.includes('@')) {
        try {
          await processMentions(
            content,
            'comment',
            entityId,
            window.location.href
          );
        } catch (mentionError) {
          console.warn('Error processing mentions:', mentionError);
          // Don't fail comment edit due to mention processing issues
        }
      }

      setEditingComment(null);
      setEditContent('');
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    const success = await deleteComment(commentToDelete);
    if (success) {
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  };

  const handleTyping = (value: string) => {
    setNewComment(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      broadcastTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 1000);
  };

  const handleReaction = async (commentId: string, reactionType: ReactionType, currentReaction?: ReactionType) => {
    if (currentReaction === reactionType) {
      // Remove reaction if same type
      await removeReaction(commentId);
    } else {
      // Add or change reaction
      await addReaction(commentId, reactionType);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      broadcastTyping(false);
    };
  }, [broadcastTyping]);

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-4">
          <p className="text-sm text-red-600">Failed to load comments: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Please log in to view and add comments.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {showTitle && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-border/10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">
                  {comments.length === 0
                    ? 'Start the conversation'
                    : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`
                  }
                </p>
              </div>
            </div>
            {comments.length > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                {comments.length}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 p-6 space-y-6 ${maxHeight !== 'none' ? `max-h-[${maxHeight}] overflow-y-auto` : 'overflow-y-auto'} scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent`}>
        {/* New Comment Input */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-blue-100">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                {user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <MentionInput
                value={newComment}
                onChange={handleTyping}
                placeholder={placeholder || "What's on your mind? Type @ to mention someone..."}
                className="min-h-[100px] border-0 bg-gray-50 rounded-lg px-4 py-3 text-sm placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all duration-200"
                workspaceId={workspaceId}
                rows={4}
                maxLength={2000}
              />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {typing.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        <span>{typing.join(', ')} typing...</span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500">Press Cmd/Ctrl + Enter to send</span>
                  </div>
                  <Button
                    onClick={() => handleSubmitComment(newComment)}
                    disabled={!newComment.trim() || loading}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-200 px-6"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {loading && comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-sm text-gray-500">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="h-16 w-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No comments yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Be the first to share your thoughts and start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  onReply={(commentId) => setReplyingTo(commentId)}
                  onEdit={(commentId, content) => {
                    setEditingComment(commentId);
                    setEditContent(content);
                  }}
                  onDelete={(commentId) => {
                    setCommentToDelete(commentId);
                    setDeleteDialogOpen(true);
                  }}
                  onReaction={handleReaction}
                  onSubmitReply={handleSubmitComment}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  editingComment={editingComment}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onCancelEdit={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  onSubmitEdit={handleEditComment}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl border border-gray-200 shadow-xl max-w-md">
            <AlertDialogHeader className="text-center pt-6">
              <div className="h-12 w-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                Delete Comment
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 mt-2">
                Are you sure you want to delete this comment? This action cannot be undone and the comment will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 pt-6">
              <AlertDialogCancel className="flex-1 border-gray-300 hover:bg-gray-50">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteComment}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReaction: (commentId: string, reactionType: ReactionType, currentReaction?: ReactionType) => void;
  onSubmitReply: (content: string, parentId: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  editingComment: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onCancelEdit: () => void;
  onSubmitEdit: (commentId: string, content: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onSubmitReply,
  replyingTo,
  setReplyingTo,
  editingComment,
  editContent,
  setEditContent,
  onCancelEdit,
  onSubmitEdit
}: CommentItemProps) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const reactionsRef = useRef<HTMLDivElement>(null);
  const isOwner = comment.author_id === currentUserId;
  const isEditing = editingComment === comment.id;
  const isReplying = replyingTo === comment.id;
  const maxDepth = 5;

  // Handle clicking outside reactions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Only close if clicking outside reactions AND not on reply button
      if (reactionsRef.current &&
          !reactionsRef.current.contains(target) &&
          !(target as Element)?.closest('[data-reply-button]')) {
        console.log('Closing reactions due to outside click');
        setShowReactions(false);
      }
    };

    if (showReactions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactions]);

  if (comment.is_deleted) {
    return (
      <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''}`}>
        <div className="text-sm text-muted-foreground italic py-2">
          [Comment deleted]
        </div>
        {comment.replies && comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            currentUserId={currentUserId}
            depth={depth + 1}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
            onSubmitReply={onSubmitReply}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            editingComment={editingComment}
            editContent={editContent}
            setEditContent={setEditContent}
            onCancelEdit={onCancelEdit}
            onSubmitEdit={onSubmitEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-6 border-l-2 border-gray-200' : ''} group`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-5 mb-4">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-gray-100">
            <AvatarImage src={comment.author?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold text-sm">
              {comment.author?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">
                  {comment.author?.display_name || 'Unknown User'}
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_edited && (
                  <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200 px-2 py-1">
                    edited
                  </Badge>
                )}
              </div>

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-100 rounded-full">
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 shadow-lg border border-gray-200 rounded-lg">
                    <DropdownMenuItem onClick={() => onEdit(comment.id, comment.content)} className="hover:bg-gray-50">
                      <Edit className="h-4 w-4 mr-2 text-gray-500" />
                      Edit comment
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete comment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Comment Content */}
            {isEditing ? (
              <div className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <MentionInput
                  value={editContent}
                  onChange={setEditContent}
                  className="min-h-[80px] border-gray-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                  placeholder="Edit your comment..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onSubmitEdit(comment.id, editContent)}
                    disabled={!editContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit} className="border-gray-300 hover:bg-gray-50">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <MentionText
                content={comment.content}
                className="text-gray-800 text-sm leading-relaxed"
                interactive={true}
              />
            )}

            {/* Reactions */}
            {Object.keys(comment.reactions).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {Object.entries(comment.reactions).map(([reactionType, count]) => {
                  if (count === 0) return null;
                  const reaction = REACTIONS.find(r => r.type === reactionType);
                  return (
                    <button
                      key={reactionType}
                      onClick={() => onReaction(comment.id, reactionType as ReactionType, comment.user_reaction)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 ${
                        comment.user_reaction === reactionType
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span className="text-sm">{reaction?.emoji}</span>
                      <span className="font-semibold">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-6 pt-2 border-t border-gray-100 mt-3">
              <div className="relative" ref={reactionsRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReactions(!showReactions)}
                  className="h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <Smile className="h-4 w-4 mr-1.5" />
                  React
                </Button>

                {showReactions && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex gap-2 z-20">
                    {REACTIONS.map((reaction) => (
                      <button
                        key={reaction.type}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onReaction(comment.id, reaction.type, comment.user_reaction);
                          setShowReactions(false);
                        }}
                        className="p-2.5 hover:bg-gray-50 rounded-lg text-lg transition-all hover:scale-110"
                        title={reaction.label}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
                disabled={depth >= maxDepth}
                className="h-8 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <Reply className="h-4 w-4 mr-1.5" />
                Reply
              </Button>
            </div>

            {/* Reply Input */}
            {isReplying && (
              <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-blue-100">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                      {user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <MentionInput
                      placeholder={`Reply to ${comment.author?.display_name || 'this comment'}... Type @ to mention someone`}
                      value={replyContent}
                      onChange={setReplyContent}
                      className="min-h-[80px] border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          onSubmitReply(replyContent, comment.id);
                          setReplyContent('');
                        }}
                        disabled={!replyContent.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-6 space-y-4 relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-gray-300 to-transparent"></div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReaction={onReaction}
              onSubmitReply={onSubmitReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              editingComment={editingComment}
              editContent={editContent}
              setEditContent={setEditContent}
              onCancelEdit={onCancelEdit}
              onSubmitEdit={onSubmitEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Comments;
