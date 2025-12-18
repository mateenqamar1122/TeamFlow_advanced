-- Mention System Database Migration
-- This migration adds mention functionality to the application

-- Create mentions table to track @username mentions
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('comment', 'task', 'project', 'workspace', 'calendar_event')),
  entity_id UUID NOT NULL,
  content_excerpt TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  context_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_id ON public.mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_workspace_id ON public.mentions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mentions_entity ON public.mentions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mentions_is_read ON public.mentions(is_read);
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON public.mentions(created_at);

-- Enable Row Level Security
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view mentions in their workspaces" ON public.mentions;
DROP POLICY IF EXISTS "Users can create mentions in their workspaces" ON public.mentions;
DROP POLICY IF EXISTS "Users can update their own mentions" ON public.mentions;
DROP POLICY IF EXISTS "Users can delete their own mentions" ON public.mentions;

-- RLS Policies for mentions
CREATE POLICY "Users can view mentions in their workspaces"
ON public.mentions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = mentions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.is_active = true
  )
  OR mentioned_user_id = auth.uid()
  OR mentioner_user_id = auth.uid()
);

CREATE POLICY "Users can create mentions in their workspaces"
ON public.mentions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = mentions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.is_active = true
  )
  AND mentioner_user_id = auth.uid()
);

CREATE POLICY "Users can update their own mentions"
ON public.mentions FOR UPDATE
USING (mentioned_user_id = auth.uid() OR mentioner_user_id = auth.uid())
WITH CHECK (mentioned_user_id = auth.uid() OR mentioner_user_id = auth.uid());

CREATE POLICY "Users can delete mentions they created"
ON public.mentions FOR DELETE
USING (mentioner_user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for mentions
DROP TRIGGER IF EXISTS update_mentions_updated_at_trigger ON public.mentions;
CREATE TRIGGER update_mentions_updated_at_trigger
BEFORE UPDATE ON public.mentions
FOR EACH ROW EXECUTE FUNCTION update_mentions_updated_at();

-- Add mention_count column to users/profiles for quick reference (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'unread_mentions_count'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN unread_mentions_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create function to update mention count
CREATE OR REPLACE FUNCTION update_user_mention_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET unread_mentions_count = (
      SELECT COUNT(*) FROM public.mentions
      WHERE mentioned_user_id = OLD.mentioned_user_id
      AND is_read = false
    )
    WHERE id = OLD.mentioned_user_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET unread_mentions_count = (
      SELECT COUNT(*) FROM public.mentions
      WHERE mentioned_user_id = NEW.mentioned_user_id
      AND is_read = false
    )
    WHERE id = NEW.mentioned_user_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_read != NEW.is_read THEN
    UPDATE public.profiles
    SET unread_mentions_count = (
      SELECT COUNT(*) FROM public.mentions
      WHERE mentioned_user_id = NEW.mentioned_user_id
      AND is_read = false
    )
    WHERE id = NEW.mentioned_user_id;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to maintain mention count
DROP TRIGGER IF EXISTS update_mention_count_insert ON public.mentions;
CREATE TRIGGER update_mention_count_insert
AFTER INSERT ON public.mentions
FOR EACH ROW EXECUTE FUNCTION update_user_mention_count();

DROP TRIGGER IF EXISTS update_mention_count_update ON public.mentions;
CREATE TRIGGER update_mention_count_update
AFTER UPDATE ON public.mentions
FOR EACH ROW EXECUTE FUNCTION update_user_mention_count();

DROP TRIGGER IF EXISTS update_mention_count_delete ON public.mentions;
CREATE TRIGGER update_mention_count_delete
AFTER DELETE ON public.mentions
FOR EACH ROW EXECUTE FUNCTION update_user_mention_count();

-- Update existing profiles to have correct mention count
UPDATE public.profiles
SET unread_mentions_count = (
  SELECT COUNT(*)
  FROM public.mentions
  WHERE mentioned_user_id = profiles.id
  AND is_read = false
)
WHERE unread_mentions_count IS NULL OR unread_mentions_count != (
  SELECT COUNT(*)
  FROM public.mentions
  WHERE mentioned_user_id = profiles.id
  AND is_read = false
);

-- Create function to extract mentions from text
CREATE OR REPLACE FUNCTION extract_mentions(content TEXT)
RETURNS TEXT[] AS $$
DECLARE
  mention_pattern TEXT := '@([a-zA-Z0-9_.-]+)';
  mentions TEXT[];
BEGIN
  SELECT array_agg(DISTINCT lower(substring(match[1] FROM 1 FOR 50)))
  INTO mentions
  FROM (
    SELECT regexp_matches(content, mention_pattern, 'g') AS match
  ) AS matches
  WHERE length(trim(match[1])) > 0;

  RETURN COALESCE(mentions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Add mentions column to comments table if it exists
DO $$
BEGIN
  -- Check if comments table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'comments'
    AND table_schema = 'public'
  ) THEN
    -- Add mentions column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'comments'
      AND column_name = 'mentions'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.comments ADD COLUMN mentions TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
  END IF;
END $$;

-- Add mentions column to tasks table if it exists
DO $$
BEGIN
  -- Check if tasks table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tasks'
    AND table_schema = 'public'
  ) THEN
    -- Add mentions column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tasks'
      AND column_name = 'mentions'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.tasks ADD COLUMN mentions TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
  END IF;
END $$;

-- Enable realtime for mentions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentions;

-- Add helpful comments
COMMENT ON TABLE public.mentions IS 'Stores @username mentions across the application';
COMMENT ON COLUMN public.mentions.mentioned_user_id IS 'User who was mentioned';
COMMENT ON COLUMN public.mentions.mentioner_user_id IS 'User who created the mention';
COMMENT ON COLUMN public.mentions.entity_type IS 'Type of entity where mention occurred';
COMMENT ON COLUMN public.mentions.entity_id IS 'ID of the entity where mention occurred';
COMMENT ON COLUMN public.mentions.content_excerpt IS 'Brief excerpt of the content containing the mention';
COMMENT ON COLUMN public.mentions.context_url IS 'URL to view the mention in context';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Mention System migration completed successfully!';
  RAISE NOTICE '📝 Mentions table created with RLS policies';
  RAISE NOTICE '🔔 Notification system ready';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '🔄 Realtime subscriptions enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to implement @username mentions!';
END $$;
