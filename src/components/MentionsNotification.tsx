import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Bell,
  BellDot,
  Check,
  CheckCheck,
  MessageCircle,
  User,
  MoreHorizontal,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useMentions, Mention } from '@/hooks/useMentions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MentionsNotificationProps {
  workspaceId?: string;
  className?: string;
  showTitle?: boolean;
  maxHeight?: string;
}

const MentionsNotification: React.FC<MentionsNotificationProps> = ({
  workspaceId,
  className,
  showTitle = true,
  maxHeight = "400px",
}) => {
  // Add error boundary for mentions hook
  const mentionsHook = useMentions({ workspaceId });

  // Provide safe defaults if hook fails
  const {
    mentions = [],
    loading = false,
    unreadCount = 0,
    markAsRead = () => Promise.resolve(),
    markAllAsRead = () => Promise.resolve(),
    deleteMention = () => Promise.resolve(),
  } = mentionsHook || {};

  const [deleteConfirmation, setDeleteConfirmation] = useState<Mention | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleMentionClick = async (mention: Mention) => {
    // Mark as read when clicked
    if (!mention.is_read) {
      await markAsRead(mention.id);
    }

    // Navigate to context if URL exists
    if (mention.context_url) {
      window.open(mention.context_url, '_blank');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;
    await deleteMention(deleteConfirmation.id);
    setDeleteConfirmation(null);
  };

  const getEntityTypeIcon = (entityType: string) => {
    switch (entityType) {
      case 'comment':
        return <MessageCircle className="h-3 w-3" />;
      case 'task':
        return <CheckCheck className="h-3 w-3" />;
      case 'project':
        return <ExternalLink className="h-3 w-3" />;
      default:
        return <Bell className="h-3 w-3" />;
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'comment':
        return 'Comment';
      case 'task':
        return 'Task';
      case 'project':
        return 'Project';
      case 'workspace':
        return 'Workspace';
      case 'calendar_event':
        return 'Event';
      default:
        return entityType;
    }
  };

  const getUserInitials = (mention: Mention): string => {
    const name = mention.mentioner_user?.display_name || 'Unknown User';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Dropdown component for header button
  const MentionsDropdown = () => (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellDot className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <span className="font-semibold text-sm">Mentions</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading mentions...
            </div>
          ) : mentions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No mentions yet
            </div>
          ) : (
            <div className="py-1">
              {mentions.slice(0, 10).map((mention) => (
                <div
                  key={mention.id}
                  className={cn(
                    "flex items-start gap-3 p-3 hover:bg-muted cursor-pointer transition-colors",
                    !mention.is_read && "bg-blue-50 hover:bg-blue-100"
                  )}
                  onClick={() => handleMentionClick(mention)}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage
                      src={mention.mentioner_user?.avatar_url}
                      alt={mention.mentioner_user?.display_name}
                    />
                    <AvatarFallback>
                      {mention.mentioner_user?.avatar_url ? (
                        <User className="h-4 w-4" />
                      ) : (
                        getUserInitials(mention)
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {mention.mentioner_user?.display_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        mentioned you in
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getEntityTypeIcon(mention.entity_type)}
                        <span className="ml-1">{getEntityTypeLabel(mention.entity_type)}</span>
                      </Badge>
                    </div>

                    {mention.content_excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        "{mention.content_excerpt}"
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(mention.created_at), { addSuffix: true })}
                      </span>
                      {!mention.is_read && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {mentions.length > 10 && (
                <div className="p-2 text-center">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all {mentions.length} mentions
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Full card component
  const MentionsCard = () => (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span>Mentions</span>
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount}</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      )}

      <CardContent>
        <div className="space-y-2" style={{ maxHeight, overflow: 'auto' }}>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading mentions...
            </div>
          ) : mentions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mentions yet</p>
              <p className="text-sm mt-1">You'll see @mentions here</p>
            </div>
          ) : (
            mentions.map((mention) => (
              <div
                key={mention.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors",
                  !mention.is_read && "bg-blue-50 border-blue-200 hover:bg-blue-100"
                )}
                onClick={() => handleMentionClick(mention)}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={mention.mentioner_user?.avatar_url}
                    alt={mention.mentioner_user?.display_name}
                  />
                  <AvatarFallback>
                    {mention.mentioner_user?.avatar_url ? (
                      <User className="h-4 w-4" />
                    ) : (
                      getUserInitials(mention)
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {mention.mentioner_user?.display_name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      mentioned you in
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getEntityTypeIcon(mention.entity_type)}
                      <span className="ml-1">{getEntityTypeLabel(mention.entity_type)}</span>
                    </Badge>
                  </div>

                  {mention.content_excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      "{mention.content_excerpt}"
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(mention.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-1">
                      {!mention.is_read && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!mention.is_read && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(mention.id);
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmation(mention);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation !== null}
        onOpenChange={() => setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mention</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mention? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );

  // Return dropdown for header use or full card
  if (className?.includes('dropdown') || !showTitle) {
    return <MentionsDropdown />;
  }

  return <MentionsCard />;
};

export default MentionsNotification;
