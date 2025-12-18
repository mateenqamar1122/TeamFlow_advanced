-- Notifications Feature Migration
-- =====================================================

-- 1. NOTIFICATIONS TABLE
-- =====================================================

-- Create notification types enum
CREATE TYPE public.notification_type AS ENUM (
  'task_assigned',
  'task_completed',
  'task_due',
  'project_update',
  'comment_mention',
  'new_comment',
  'file_uploaded',
  'milestone_reached',
  'system_announcement'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  entity_id UUID, -- Can reference a task, project, comment, etc.
  entity_type TEXT, -- e.g., 'task', 'project'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
  ON public.notifications
  FOR ALL
  USING (user_id = auth.uid());

-- 4. DATABASE FUNCTIONS
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_message TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, entity_id, entity_type, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_entity_id, p_entity_type, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- =====================================================

-- Trigger for task assignment
CREATE OR REPLACE FUNCTION handle_task_assignment_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.assignee_id IS NOT NULL AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned a new task: "' || NEW.title || '"',
      NEW.id,
      'task'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignment_notification_trigger
  AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_assignment_notification();

-- Trigger for comment mentions
CREATE OR REPLACE FUNCTION handle_comment_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.mentions IS NOT NULL THEN
    FOREACH mentioned_user_id IN ARRAY (SELECT jsonb_array_elements_text(NEW.mentions::jsonb))
    LOOP
      PERFORM public.create_notification(
        mentioned_user_id,
        'comment_mention',
        'You were mentioned in a comment',
        'You have been mentioned in a comment on ' || NEW.entity_type,
        NEW.entity_id,
        NEW.entity_type
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_mention_notification_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION handle_comment_mention_notification();
