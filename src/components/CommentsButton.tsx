import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MessageCircle, X, Users, Clock } from 'lucide-react';
import { Comments } from '@/components/Comments';
import { useComments } from '@/hooks/useComments';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CommentsButtonProps {
  entityType: 'project' | 'task' | 'workspace' | 'calendar_event';
  entityId: string;
  workspaceId: string;
  projectName?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CommentsButton({
  entityType,
  entityId,
  workspaceId,
  projectName,
  className,
  variant = 'ghost',
  size = 'sm'
}: CommentsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Get comment count for the badge
  const { comments, loading } = useComments({
    entityType,
    entityId,
    workspaceId,
    enabled: true
  });

  const commentCount = comments?.length || 0;
  const title = projectName ? `Comments for "${projectName}"` : 'Comments';

  const TriggerButton = (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "flex items-center gap-3 relative transition-all duration-300 group overflow-hidden",
        "bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100",
        "border border-blue-200/50 hover:border-blue-300/70 shadow-sm hover:shadow-md",
        "text-gray-700 hover:text-gray-900",
        commentCount > 0 && "bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300",
        "rounded-lg px-4 py-2.5",
        className
      )}
      title={commentCount === 0
        ? "Open comments to start a discussion"
        : `View ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`
      }
      aria-label={`Comments for ${projectName || 'this item'}`}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8  transition-all duration-300",
        "shadow-sm group-hover:shadow-md group-hover:scale-105 rounded-lg bg-white/90 group-hover:bg-white",
      )}>
        <MessageCircle className="h-4 w-4 text-orange" />
      </div>

      <div className="flex flex-col items-start">
        <span className="text-sm font-semibold leading-none">
          {commentCount > 0
            ? `${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}`
            : 'Comments'
          }
        </span>
        <span className="text-xs text-gray-500 mt-0.5">
          {commentCount === 0 ? 'Start discussion' : 'Join conversation'}
        </span>
      </div>

      {commentCount > 0 && (
        <Badge
          variant="secondary"
          className="ml-auto h-6 min-w-6 px-2 flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-700 border-0 group-hover:scale-110 transition-transform shadow-sm"
        >
          {commentCount > 99 ? '99+' : commentCount}
        </Badge>
      )}

      {loading && (
        <div className="absolute top-1 right-1">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}


    </Button>
  );

  // Use Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {TriggerButton}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-[95vh] flex flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl"
        >
          <SheetHeader className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center shadow-sm">
                    <MessageCircle className="h-6 w-6 text-gray-600" />
                  </div>
                  {commentCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-gray-800 rounded-full flex items-center justify-center ring-2 ring-white">
                      <span className="text-xs font-bold text-white">{commentCount > 9 ? '9+' : commentCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <SheetTitle className="text-xl font-bold text-gray-900">{title}</SheetTitle>
                  <SheetDescription className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    {commentCount === 0 ? (
                      <>
                        <Users className="h-4 w-4" />
                        <span>Be the first to start the conversation!</span>
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        <span>{commentCount} {commentCount === 1 ? 'person has' : 'people have'} commented</span>
                        <span>•</span>
                        <Clock className="h-4 w-4" />
                        <span>Active discussion</span>
                      </>
                    )}
                  </SheetDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 p-0 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden">
            <div className="h-full bg-gray-50 p-4 pt-2">
              <Comments
                entityType={entityType}
                entityId={entityId}
                workspaceId={workspaceId}
                title={title}
                showTitle={false}
                maxHeight="100%"
                placeholder="Share your thoughts about this project..."
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col gap-0 p-0 rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center shadow-sm ring-2 ring-gray-200">
                  <MessageCircle className="h-7 w-7 text-gray-600" />
                </div>
                {commentCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-6 w-6 bg-gray-800 rounded-full flex items-center justify-center ring-2 ring-white">
                    <span className="text-xs font-bold text-white">{commentCount > 99 ? '99+' : commentCount}</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-gray-900">{title}</DialogTitle>
                <DialogDescription className="text-base text-gray-600 mt-2 flex items-center gap-3">
                  {commentCount === 0 ? (
                    <>
                      <Users className="h-5 w-5 text-gray-500" />
                      <span>Start a meaningful conversation about this project</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-5 w-5 text-gray-500" />
                      <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
                      <span className="text-gray-400">•</span>
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span>Join the active discussion</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-10 w-10 p-0 shrink-0 hover:bg-gray-100 rounded-xl transition-colors group"
            >
              {/*<X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />*/}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-gray-50">
          <div className="h-full p-6 pt-4">
            <Comments
              entityType={entityType}
              entityId={entityId}
              workspaceId={workspaceId}
              title={title}
              showTitle={false}
              maxHeight="100%"
              placeholder="Share your thoughts about this project..."
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommentsButton;
