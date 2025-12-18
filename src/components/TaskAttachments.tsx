import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Upload,
  Download,
  Trash2,
  MoreVertical,
  Paperclip,
  FileText,
  X,
  AlertCircle
} from 'lucide-react';
import { useTaskAttachments, TaskAttachment } from '@/hooks/useTaskAttachments';
import { cn } from '@/lib/utils';

interface TaskAttachmentsProps {
  taskId: string;
  className?: string;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskId, className }) => {
  const {
    attachments,
    loading,
    uploading,
    uploadProgress,
    uploadFiles,
    deleteAttachment,
    downloadAttachment,
    formatFileSize,
    getFileIcon
  } = useTaskAttachments(taskId);

  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<TaskAttachment | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    uploadFiles(fileArray, taskId);
  }, [uploadFiles, taskId]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmation) return;
    await deleteAttachment(deleteConfirmation.id);
    setDeleteConfirmation(null);
  }, [deleteConfirmation, deleteAttachment]);

  // Format upload date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get file type badge color
  const getFileTypeBadgeVariant = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'default';
    if (mimeType === 'application/pdf') return 'destructive';
    if (mimeType.includes('word')) return 'secondary';
    if (mimeType.includes('sheet')) return 'outline';
    return 'default';
  }, []);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Paperclip className="h-5 w-5" />
          Attachments
          {attachments.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {attachments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-gray-400',
            uploading && 'pointer-events-none opacity-50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supports images, documents, videos, and more (max 10MB each)
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.zip,.mp4,.mp3"
          />
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploading Files</h4>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{progress.file.name}</span>
                  <span className="text-xs text-gray-500">
                    {progress.status === 'completed' ? '✓' :
                     progress.status === 'error' ? '✗' : `${progress.progress}%`}
                  </span>
                </div>
                <Progress
                  value={progress.progress}
                  className={cn(
                    'h-1',
                    progress.status === 'error' && 'bg-red-100'
                  )}
                />
                {progress.status === 'error' && progress.error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {progress.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Attachments List */}
        {loading && attachments.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Loading attachments...
          </div>
        )}

        {!loading && attachments.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No attachments yet</p>
            <p className="text-xs mt-1">Upload files to get started</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <h4 className="text-sm font-medium">Files ({attachments.length})</h4>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 text-2xl">
                    {getFileIcon(attachment.mime_type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {attachment.original_filename}
                      </p>
                      <Badge
                        variant={getFileTypeBadgeVariant(attachment.mime_type)}
                        className="text-xs"
                      >
                        {attachment.mime_type.split('/')[1]?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>Uploaded {formatDate(attachment.upload_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadAttachment(attachment)}
                      className="h-8 w-8 p-0"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => downloadAttachment(attachment)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirmation(attachment)}
                          className="flex items-center gap-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmation !== null}
        onOpenChange={() => setDeleteConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmation?.original_filename}"?
              This action cannot be undone.
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
};

export default TaskAttachments;
