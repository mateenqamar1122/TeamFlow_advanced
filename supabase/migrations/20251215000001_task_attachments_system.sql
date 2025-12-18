-- Task Attachments System Migration
-- This migration creates the file attachment system for tasks

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_workspace_id ON public.task_attachments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_task_attachments_upload_date ON public.task_attachments(upload_date);

-- Enable Row Level Security
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_attachments
CREATE POLICY "Users can view attachments in their workspace tasks"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = task_attachments.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.is_active = true
  )
);

CREATE POLICY "Users can upload attachments to workspace tasks"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = task_attachments.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.is_active = true
  )
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Users can update their own attachments"
ON public.task_attachments
FOR UPDATE
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own attachments or workspace admins can delete any"
ON public.task_attachments
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = task_attachments.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
    AND wm.is_active = true
  )
);

-- Create storage bucket for task attachments if it doesn't exist
DO $$
BEGIN
  -- Try to create the storage bucket, handle errors gracefully
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('task-attachments', 'task-attachments', false)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN others THEN
      -- If storage.buckets table doesn't exist, log a notice
      RAISE NOTICE 'Could not create storage bucket. Storage may not be enabled. Error: %', SQLERRM;
  END;
END $$;

-- Create storage policies (with error handling for environments without storage)
DO $$
BEGIN
  -- Try to create storage policies, handle errors gracefully
  BEGIN
    -- Drop existing policies first (ignore errors if they don't exist)
    DROP POLICY IF EXISTS "Users can view files in their workspace" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload files to their workspace" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own files or admins can delete any" ON storage.objects;

    -- Users can view files in their workspace
    CREATE POLICY "Users can view files in their workspace"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'task-attachments'
      AND EXISTS (
        SELECT 1 FROM public.task_attachments ta
        JOIN public.workspace_members wm ON ta.workspace_id = wm.workspace_id
        WHERE ta.file_path = storage.objects.name
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
      )
    );

    -- Users can upload files to their workspace
    CREATE POLICY "Users can upload files to their workspace"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'task-attachments'
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
      )
    );

    -- Users can update their own files
    CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'task-attachments'
      AND owner = auth.uid()
    )
    WITH CHECK (
      bucket_id = 'task-attachments'
      AND owner = auth.uid()
    );

    -- Users can delete their own files or admins can delete any
    CREATE POLICY "Users can delete their own files or admins can delete any"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'task-attachments'
      AND (
        owner = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.task_attachments ta
          JOIN public.workspace_members wm ON ta.workspace_id = wm.workspace_id
          WHERE ta.file_path = storage.objects.name
          AND wm.user_id = auth.uid()
          AND wm.role = 'admin'
          AND wm.is_active = true
        )
      )
    );

    RAISE NOTICE 'Storage policies created successfully';

  EXCEPTION
    WHEN others THEN
      -- If storage policies can't be created, log a notice but don't fail the migration
      RAISE NOTICE 'Could not create storage policies. Storage may not be enabled or configured. Error: %', SQLERRM;
  END;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for task_attachments
DROP TRIGGER IF EXISTS update_task_attachments_updated_at ON public.task_attachments;
CREATE TRIGGER update_task_attachments_updated_at
BEFORE UPDATE ON public.task_attachments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Storage file cleanup is handled on the client-side to avoid server-side function issues
-- No server-side storage triggers are created to prevent storage.delete_object errors

-- Add attachment count column to tasks table for quick reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'attachment_count'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN attachment_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create function to update attachment count
CREATE OR REPLACE FUNCTION update_task_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.tasks
    SET attachment_count = (
      SELECT COUNT(*) FROM public.task_attachments
      WHERE task_id = OLD.task_id
    )
    WHERE id = OLD.task_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE public.tasks
    SET attachment_count = (
      SELECT COUNT(*) FROM public.task_attachments
      WHERE task_id = NEW.task_id
    )
    WHERE id = NEW.task_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain attachment count
DROP TRIGGER IF EXISTS update_task_attachment_count_insert ON public.task_attachments;
CREATE TRIGGER update_task_attachment_count_insert
AFTER INSERT ON public.task_attachments
FOR EACH ROW EXECUTE FUNCTION update_task_attachment_count();

DROP TRIGGER IF EXISTS update_task_attachment_count_delete ON public.task_attachments;
CREATE TRIGGER update_task_attachment_count_delete
AFTER DELETE ON public.task_attachments
FOR EACH ROW EXECUTE FUNCTION update_task_attachment_count();

-- Update existing tasks to have correct attachment count
UPDATE public.tasks
SET attachment_count = (
  SELECT COUNT(*)
  FROM public.task_attachments
  WHERE task_attachments.task_id = tasks.id
)
WHERE attachment_count IS NULL OR attachment_count != (
  SELECT COUNT(*)
  FROM public.task_attachments
  WHERE task_attachments.task_id = tasks.id
);

-- Add helpful comments
COMMENT ON TABLE public.task_attachments IS 'Stores file attachments for tasks';
COMMENT ON COLUMN public.task_attachments.filename IS 'Unique filename in storage';
COMMENT ON COLUMN public.task_attachments.original_filename IS 'Original filename uploaded by user';
COMMENT ON COLUMN public.task_attachments.file_path IS 'Full path to file in storage bucket';
COMMENT ON COLUMN public.task_attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.task_attachments.mime_type IS 'MIME type of the file';
