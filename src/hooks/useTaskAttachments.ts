import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

export interface TaskAttachment {
  id: string;
  task_id: string;
  workspace_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const useTaskAttachments = (taskId?: string) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});

  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { toast } = useToast();

  // Fetch attachments for a specific task
  const fetchAttachments = useCallback(async (targetTaskId?: string) => {
    if (!targetTaskId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', targetTaskId)
        .order('upload_date', { ascending: false });

      if (error) {
        console.error('Database error fetching attachments:', error);
        throw new Error(`Failed to fetch attachments: ${error.message}`);
      }

      // Type assertion to ensure correct type
      const typedData = (data || []) as TaskAttachment[];
      setAttachments(typedData);

      console.log(`Fetched ${typedData.length} attachments for task ${targetTaskId}`);

    } catch (error: any) {
      console.error('Error fetching attachments:', error);
      setAttachments([]); // Clear attachments on error
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch attachments",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, supabase]);

  // Upload multiple files
  const uploadFiles = useCallback(async (files: File[], targetTaskId: string) => {
    if (!user || !currentWorkspace) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in and have a workspace selected to upload files",
      });
      return [];
    }

    if (!files.length) return [];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-zip-compressed',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/mp3'
    ];

    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `${file.name} is larger than 10MB and cannot be uploaded.`,
        });
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: `${file.name} is not a supported file type.`,
        });
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) return [];

    setUploading(true);
    const uploadedAttachments: TaskAttachment[] = [];

    try {
      for (const file of validFiles) {
        const fileId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentWorkspace.id}/${targetTaskId}/${fileId}.${fileExt}`;

        // Initialize progress tracking
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: {
            file,
            progress: 0,
            status: 'uploading'
          }
        }));

        try {
          // Upload file to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(fileName, file, {
              upsert: false,
              cacheControl: '3600'
            });

          if (uploadError) throw uploadError;

          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 50,
              status: 'uploading'
            }
          }));

          // Create attachment record
          const { data: attachmentData, error: dbError } = await supabase
            .from('task_attachments')
            .insert({
              task_id: targetTaskId,
              workspace_id: currentWorkspace.id,
              filename: `${fileId}.${fileExt}`,
              original_filename: file.name,
              file_path: fileName,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id
            })
            .select()
            .single();

          if (dbError) {
            // Clean up uploaded file if database insert fails
            await supabase.storage.from('task-attachments').remove([fileName]);
            throw dbError;
          }

          uploadedAttachments.push(attachmentData);

          // Update progress to completed
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 100,
              status: 'completed'
            }
          }));

        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              status: 'error',
              error: error.message
            }
          }));

          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: `Failed to upload ${file.name}: ${error.message}`,
          });
        }
      }

      if (uploadedAttachments.length > 0) {
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${uploadedAttachments.length} file(s)`,
        });

        // Refresh attachments list
        await fetchAttachments(targetTaskId);
      }

    } finally {
      setUploading(false);
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress({});
      }, 3000);
    }

    return uploadedAttachments;
  }, [user, currentWorkspace, toast, fetchAttachments, supabase]);

  // Delete an attachment
  const deleteAttachment = useCallback(async (attachmentId: string) => {
    try {
      // First, get the attachment details to know which file to delete
      const attachmentToDelete = attachments.find(att => att.id === attachmentId);

      if (!attachmentToDelete) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Attachment not found in local state",
        });
        return;
      }

      // First verify the record exists in the database
      const { data: existingRecord, error: fetchError } = await supabase
        .from('task_attachments')
        .select('id, file_path')
        .eq('id', attachmentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking attachment existence:', fetchError);
        throw new Error('Failed to verify attachment exists');
      }

      if (!existingRecord) {
        // Record doesn't exist in database, just remove from local state
        console.warn('Attachment record not found in database, removing from local state');
        setAttachments(prev => prev.filter(att => att.id !== attachmentId));
        toast({
          title: "Removed",
          description: "Attachment removed from list (was already deleted)",
        });
        return;
      }

      // Try to delete the file from storage first (before database record)
      let storageDeleteSuccess = false;
      try {
        const { error: storageError } = await supabase.storage
          .from('task-attachments')
          .remove([existingRecord.file_path]);

        if (!storageError) {
          storageDeleteSuccess = true;
          console.log('File deleted from storage successfully');
        } else {
          console.warn('Storage deletion failed:', storageError.message);
        }
      } catch (storageError) {
        console.warn('Storage deletion error:', storageError);
      }

      // Delete the database record
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw new Error(`Failed to delete attachment record: ${dbError.message}`);
      }

      // Update local state
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));

      // Show appropriate success message
      toast({
        title: "Deleted",
        description: storageDeleteSuccess
          ? "Attachment and file deleted successfully"
          : "Attachment deleted (file cleanup may be needed)",
      });

      console.log('Attachment deleted successfully:', {
        id: attachmentId,
        storageDeleted: storageDeleteSuccess
      });

    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete attachment",
      });
    }
  }, [toast, attachments, supabase]);

  // Get download URL for an attachment
  const getDownloadUrl = useCallback(async (attachment: TaskAttachment): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      console.error('Error getting download URL:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get download URL",
      });
      return null;
    }
  }, [toast, supabase]);

  // Download an attachment
  const downloadAttachment = useCallback(async (attachment: TaskAttachment) => {
    const url = await getDownloadUrl(attachment);
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.original_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [getDownloadUrl]);

  // Get file size in human readable format
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get file icon based on mime type
  const getFileIcon = useCallback((mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('zip')) return '📦';
    if (mimeType.startsWith('text/')) return '📄';
    return '📎';
  }, []);

  // Load attachments when taskId changes
  useEffect(() => {
    if (taskId) {
      fetchAttachments(taskId);
    }
  }, [taskId, fetchAttachments]);

  return {
    attachments,
    loading,
    uploading,
    uploadProgress,
    fetchAttachments,
    uploadFiles,
    deleteAttachment,
    downloadAttachment,
    getDownloadUrl,
    formatFileSize,
    getFileIcon
  };
};
