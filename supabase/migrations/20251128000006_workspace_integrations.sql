-- Workspace Integrations Migration
-- Add support for workspace integrations and API keys

-- Create integrations table
CREATE TABLE IF NOT EXISTS public.workspace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- github, slack, zoom, trello, email, webhooks
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  credentials JSONB DEFAULT '{}'::jsonb, -- encrypted credentials
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(workspace_id, integration_type)
);

-- Create API keys table
CREATE TABLE IF NOT EXISTS public.workspace_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- hashed API key
  key_preview TEXT NOT NULL, -- first 8 chars for display
  permissions JSONB DEFAULT '{"read": true, "write": false, "admin": false}'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create webhook endpoints table
CREATE TABLE IF NOT EXISTS public.workspace_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT, -- webhook secret for verification
  events TEXT[] DEFAULT '{}', -- events to listen for
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX idx_workspace_integrations_workspace ON public.workspace_integrations(workspace_id);
CREATE INDEX idx_workspace_integrations_type ON public.workspace_integrations(integration_type);
CREATE INDEX idx_workspace_api_keys_workspace ON public.workspace_api_keys(workspace_id);
CREATE INDEX idx_workspace_webhooks_workspace ON public.workspace_webhooks(workspace_id);

-- Add RLS policies
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_webhooks ENABLE ROW LEVEL SECURITY;

-- Integrations policies
CREATE POLICY "workspace_integrations_select" ON public.workspace_integrations
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "workspace_integrations_manage" ON public.workspace_integrations
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
  )
);

-- API keys policies (more restricted)
CREATE POLICY "workspace_api_keys_select" ON public.workspace_api_keys
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
  )
);

CREATE POLICY "workspace_api_keys_manage" ON public.workspace_api_keys
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
  )
);

-- Webhooks policies
CREATE POLICY "workspace_webhooks_select" ON public.workspace_webhooks
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
  )
);

CREATE POLICY "workspace_webhooks_manage" ON public.workspace_webhooks
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
  )
);

-- Add updated_at triggers
CREATE TRIGGER workspace_integrations_updated_at
  BEFORE UPDATE ON public.workspace_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER workspace_api_keys_updated_at
  BEFORE UPDATE ON public.workspace_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER workspace_webhooks_updated_at
  BEFORE UPDATE ON public.workspace_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  key TEXT := 'tw_';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    key := key || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;
  RETURN key;
END;
$$ LANGUAGE plpgsql;
