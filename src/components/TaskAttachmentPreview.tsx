import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Paperclip, Download } from 'lucide-react';
import { useTaskAttachments } from '@/hooks/useTaskAttachments';
import { cn } from '@/lib/utils';

interface TaskAttachmentPreviewProps {
  taskId: string;
  showCount?: boolean;
  showDownload?: boolean;
  className?: string;
}

const TaskAttachmentPreview: React.FC<TaskAttachmentPreviewProps> = ({
  taskId,
  showCount = true,
  showDownload = false,
  className
}) => {
  const {
    attachments,
    loading,
    downloadAttachment,
    formatFileSize,
    getFileIcon
  } = useTaskAttachments(taskId);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-gray-400', className)}>
        <Paperclip className="h-3 w-3" />
        <span>Loading...</span>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Paperclip className="h-3 w-3" />
              {showCount && (
                <Badge variant="secondary" className="h-4 px-1 text-xs">
                  {attachments.length}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Attachments ({attachments.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {attachments.slice(0, 5).map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-xs">
                    <span className="text-base">{getFileIcon(attachment.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{attachment.original_filename}</p>
                      <p className="text-gray-400">{formatFileSize(attachment.file_size)}</p>
                    </div>
                    {showDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          downloadAttachment(attachment);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {attachments.length > 5 && (
                  <p className="text-xs text-gray-400 pt-1 border-t">
                    +{attachments.length - 5} more files
                  </p>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default TaskAttachmentPreview;
