-- Team Reminder System Migration
-- ============================================================================

-- 1. REMINDER TABLES
-- ============================================================================

-- Reminders table for team notifications and alerts
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN (
    'task_deadline', 'meeting', 'project_milestone', 'custom', 'time_tracking',
    'daily_standup', 'weekly_review', 'sprint_planning', 'retrospective'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Scheduling
  reminder_datetime TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  recurring_pattern JSONB DEFAULT NULL, -- For recurring reminders

  -- Recipients
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('individual', 'team', 'workspace', 'role')),
  recipients JSONB NOT NULL, -- Array of user IDs or role names

  -- Related entities
  related_entity_type TEXT CHECK (related_entity_type IN ('task', 'project', 'meeting', 'milestone')),
  related_entity_id UUID,

  -- Notification channels
  notification_channels JSONB DEFAULT '["in_app"]'::jsonb, -- in_app, email, slack, teams

  -- Status and execution
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sent', 'cancelled', 'expired')),
  sent_at TIMESTAMPTZ,
  acknowledged_by JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who acknowledged

  -- Snoozing
  snoozed_until TIMESTAMPTZ,
  snooze_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reminder templates for common reminder types
CREATE TABLE public.reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL,
  template_content JSONB NOT NULL, -- Template for title, description, etc.
  default_priority TEXT DEFAULT 'medium',
  default_channels JSONB DEFAULT '["in_app"]'::jsonb,
  default_advance_time INTERVAL DEFAULT '1 hour',
  is_shared BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reminder delivery log
CREATE TABLE public.reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'acknowledged')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Team availability and working hours
CREATE TABLE public.team_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Working hours per day
  working_hours JSONB DEFAULT '{
    "monday": {"start": "09:00", "end": "17:00", "enabled": true, "breaks": []},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true, "breaks": []},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true, "breaks": []},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true, "breaks": []},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true, "breaks": []},
    "saturday": {"start": "09:00", "end": "17:00", "enabled": false, "breaks": []},
    "sunday": {"start": "09:00", "end": "17:00", "enabled": false, "breaks": []}
  }'::jsonb,

  timezone TEXT DEFAULT 'UTC',

  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "email": {"enabled": true, "quiet_hours": {"start": "18:00", "end": "09:00"}},
    "in_app": {"enabled": true, "quiet_hours": null},
    "slack": {"enabled": false, "quiet_hours": {"start": "18:00", "end": "09:00"}},
    "teams": {"enabled": false, "quiet_hours": {"start": "18:00", "end": "09:00"}}
  }'::jsonb,

  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'away', 'do_not_disturb', 'offline')),
  status_message TEXT,
  status_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(workspace_id, user_id)
);

-- Reminder escalation rules
CREATE TABLE public.reminder_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL, -- Conditions for when to escalate
  escalation_steps JSONB NOT NULL, -- Array of escalation steps
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_reminders_workspace ON public.reminders(workspace_id);
CREATE INDEX idx_reminders_datetime ON public.reminders(reminder_datetime);
CREATE INDEX idx_reminders_status ON public.reminders(status);
CREATE INDEX idx_reminders_type ON public.reminders(reminder_type);
CREATE INDEX idx_reminders_recipients ON public.reminders USING gin(recipients);
CREATE INDEX idx_reminder_deliveries_reminder ON public.reminder_deliveries(reminder_id);
CREATE INDEX idx_reminder_deliveries_user ON public.reminder_deliveries(user_id);
CREATE INDEX idx_team_availability_workspace_user ON public.team_availability(workspace_id, user_id);

-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_escalation_rules ENABLE ROW LEVEL SECURITY;

-- Reminders policies
CREATE POLICY "Users can view reminders in their workspaces" ON public.reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = reminders.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can create reminders in their workspaces" ON public.reminders
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = reminders.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own reminders" ON public.reminders
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own reminders" ON public.reminders
  FOR DELETE USING (created_by = auth.uid());

-- Reminder templates policies
CREATE POLICY "Users can view templates in their workspaces" ON public.reminder_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = reminder_templates.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage their own templates" ON public.reminder_templates
  FOR ALL USING (created_by = auth.uid());

-- Reminder deliveries policies
CREATE POLICY "Users can view their reminder deliveries" ON public.reminder_deliveries
  FOR SELECT USING (user_id = auth.uid());

-- Team availability policies
CREATE POLICY "Users can view availability in their workspaces" ON public.team_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = team_availability.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage their own availability" ON public.team_availability
  FOR ALL USING (user_id = auth.uid());

-- Escalation rules policies
CREATE POLICY "Workspace members can view escalation rules" ON public.reminder_escalation_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = reminder_escalation_rules.workspace_id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Workspace admins can manage escalation rules" ON public.reminder_escalation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = reminder_escalation_rules.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND is_active = true
    )
  );

-- 4. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to create default team availability for new workspace members
CREATE OR REPLACE FUNCTION create_default_team_availability()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_availability (workspace_id, user_id)
  VALUES (NEW.workspace_id, NEW.user_id)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_team_availability
  AFTER INSERT ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_team_availability();

-- Function to process recurring reminders
CREATE OR REPLACE FUNCTION process_recurring_reminder()
RETURNS TRIGGER AS $$
DECLARE
  next_reminder_time TIMESTAMPTZ;
  pattern JSONB;
BEGIN
  -- Only process when reminder is sent
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.recurring_pattern IS NOT NULL THEN
    pattern := NEW.recurring_pattern;

    -- Calculate next occurrence based on pattern
    CASE pattern->>'type'
      WHEN 'daily' THEN
        next_reminder_time := NEW.reminder_datetime + (pattern->>'interval_days')::INTEGER * INTERVAL '1 day';
      WHEN 'weekly' THEN
        next_reminder_time := NEW.reminder_datetime + (pattern->>'interval_weeks')::INTEGER * INTERVAL '1 week';
      WHEN 'monthly' THEN
        next_reminder_time := NEW.reminder_datetime + (pattern->>'interval_months')::INTEGER * INTERVAL '1 month';
      WHEN 'yearly' THEN
        next_reminder_time := NEW.reminder_datetime + (pattern->>'interval_years')::INTEGER * INTERVAL '1 year';
      ELSE
        RETURN NEW; -- Unknown pattern, don't create next occurrence
    END CASE;

    -- Check if we should continue recurring
    IF pattern->>'end_date' IS NULL OR next_reminder_time <= (pattern->>'end_date')::TIMESTAMPTZ THEN
      -- Create next occurrence
      INSERT INTO public.reminders (
        workspace_id, created_by, title, description, reminder_type, priority,
        reminder_datetime, timezone, recurring_pattern, recipient_type, recipients,
        related_entity_type, related_entity_id, notification_channels, status
      ) VALUES (
        NEW.workspace_id, NEW.created_by, NEW.title, NEW.description, NEW.reminder_type, NEW.priority,
        next_reminder_time, NEW.timezone, NEW.recurring_pattern, NEW.recipient_type, NEW.recipients,
        NEW.related_entity_type, NEW.related_entity_id, NEW.notification_channels, 'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_recurring_reminder
  AFTER UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION process_recurring_reminder();

-- Function to update reminder template usage count
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reminder_type IS NOT NULL THEN
    UPDATE public.reminder_templates
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE workspace_id = NEW.workspace_id
      AND reminder_type = NEW.reminder_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_usage
  AFTER INSERT ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage();

-- 5. DEFAULT REMINDER TEMPLATES
-- ============================================================================

-- Note: These will be inserted via the application when a workspace is created
