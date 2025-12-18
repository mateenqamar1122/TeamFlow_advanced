-- Real-time Comments System Migration
-- ===================================

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Polymorphic relationships (can comment on tasks, projects, etc.)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'workspace', 'calendar_event')),
  entity_id UUID NOT NULL,

  -- Threading support
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  thread_level INTEGER DEFAULT 0,

  -- Status and metadata
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Mentions and reactions support
  mentions JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '{}',

  CONSTRAINT valid_thread_level CHECK (thread_level >= 0 AND thread_level <= 5)
);

-- Create comment_reactions table for detailed reaction tracking
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'thumbs_up', 'thumbs_down', 'confused', 'heart')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(comment_id, user_id, reaction_type)
);

-- Create comment_attachments table
CREATE TABLE IF NOT EXISTS comment_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_workspace ON comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON comment_attachments(comment_id);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "Users can view comments in their workspaces" ON comments
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can create comments in their workspaces" ON comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (
    author_id = auth.uid() AND
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can soft delete their own comments" ON comments
  FOR DELETE USING (
    author_id = auth.uid() OR
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND wm.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for comment_reactions
CREATE POLICY "Users can view reactions in their workspaces" ON comment_reactions
  FOR SELECT USING (
    comment_id IN (
      SELECT c.id FROM comments c
      WHERE c.workspace_id IN (
        SELECT wm.workspace_id
        FROM workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.is_active = true
      )
    )
  );

CREATE POLICY "Users can add reactions in their workspaces" ON comment_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    comment_id IN (
      SELECT c.id FROM comments c
      JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

CREATE POLICY "Users can remove their own reactions" ON comment_reactions
  FOR DELETE USING (
    user_id = auth.uid() AND
    comment_id IN (
      SELECT c.id FROM comments c
      JOIN workspace_members wm ON c.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- RLS Policies for comment_attachments
CREATE POLICY "Users can view attachments in their workspaces" ON comment_attachments
  FOR SELECT USING (
    comment_id IN (
      SELECT c.id FROM comments c
      WHERE c.workspace_id IN (
        SELECT wm.workspace_id
        FROM workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.is_active = true
      )
    )
  );

CREATE POLICY "Users can create attachments for their comments" ON comment_attachments
  FOR INSERT WITH CHECK (
    comment_id IN (
      SELECT c.id FROM comments c
      WHERE c.author_id = auth.uid()
    )
  );

-- Enable real-time for comments
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_attachments;

-- Create function to update comment timestamps
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF OLD.content != NEW.content THEN
    NEW.is_edited = TRUE;
    NEW.edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();

-- Grant permissions
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_reactions TO authenticated;
GRANT ALL ON comment_attachments TO authenticated;
