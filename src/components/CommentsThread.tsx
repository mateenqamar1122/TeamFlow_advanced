import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Comments } from './Comments';
import { useComments, type CommentEntity } from '@/hooks/useComments';

interface CommentsThreadProps {
  entityType: CommentEntity;
  entityId: string;
  workspaceId: string;
  trigger?: React.ReactNode;
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  side?: 'left' | 'right' | 'top' | 'bottom';
  title?: string;
}

export function CommentsThread({
  entityType,
  entityId,
  workspaceId,
  trigger,
  buttonVariant = 'ghost',
  side = 'right',
  title
}: CommentsThreadProps) {
  const [open, setOpen] = useState(false);

  const { comments } = useComments({
    entityType,
    entityId,
    workspaceId,
    enabled: !!entityId && !!workspaceId
  });

  const commentCount = comments.reduce((total, comment) => {
    const replyCount = comment.replies ? comment.replies.length : 0;
    return total + 1 + replyCount;
  }, 0);

  const defaultTrigger = (
    <Button variant={buttonVariant} size="sm" className="gap-2">
      <MessageCircle className="h-4 w-4" />
      Comments
      {commentCount > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {commentCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side={side} className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{title || 'Comments'}</span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 h-full overflow-hidden">
          <Comments
            entityType={entityType}
            entityId={entityId}
            workspaceId={workspaceId}
            showTitle={false}
            maxHeight="calc(100vh - 120px)"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CommentsThread;
