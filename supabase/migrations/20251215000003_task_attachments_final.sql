-- Task Attachments System Migration (Final Clean Version)
-- This migration creates the file attachment system without problematic storage triggers

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

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view attachments in their workspace tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can upload attachments to workspace tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can update their own attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments or workspace admins can delete any" ON public.task_attachments;

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
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('task-attachments', 'task-attachments', false)
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Storage bucket created or already exists';
  EXCEPTION
    WHEN others THEN
      RAISE NOTICE 'Could not create storage bucket. Create manually in Supabase Dashboard. Error: %', SQLERRM;
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

-- Create trigger for task_attachments updated_at
DROP TRIGGER IF EXISTS update_task_attachments_updated_at ON public.task_attachments;
CREATE TRIGGER update_task_attachments_updated_at
BEFORE UPDATE ON public.task_attachments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
SET attachment_count = COALESCE((
  SELECT COUNT(*)
  FROM public.task_attachments
  WHERE task_attachments.task_id = tasks.id
), 0)
WHERE attachment_count IS NULL OR attachment_count != COALESCE((
  SELECT COUNT(*)
  FROM public.task_attachments
  WHERE task_attachments.task_id = tasks.id
), 0);

-- Clean up any orphaned storage cleanup triggers from previous migrations
DROP TRIGGER IF EXISTS cleanup_attachment_file_trigger ON public.task_attachments;
DROP FUNCTION IF EXISTS cleanup_attachment_file();

-- Add helpful comments
COMMENT ON TABLE public.task_attachments IS 'Stores file attachments for tasks';
COMMENT ON COLUMN public.task_attachments.filename IS 'Unique filename in storage';
COMMENT ON COLUMN public.task_attachments.original_filename IS 'Original filename uploaded by user';
COMMENT ON COLUMN public.task_attachments.file_path IS 'Full path to file in storage bucket';
COMMENT ON COLUMN public.task_attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.task_attachments.mime_type IS 'MIME type of the file';

-- Final notices
DO $$
BEGIN
  RAISE NOTICE '✅ Task Attachments migration completed successfully!';
  RAISE NOTICE '📁 Database table and policies created';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '🗂️ Storage bucket created (if possible)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Verify storage bucket exists in Supabase Dashboard';
  RAISE NOTICE '2. Configure storage policies manually if needed';
  RAISE NOTICE '3. Test file upload/download/delete functionality';
  RAISE NOTICE '4. Storage file cleanup is handled client-side for reliability';
END $$;
