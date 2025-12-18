import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from '@/hooks/use-toast';

export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  integration_type: string;
  name: string;
  config: Record<string, any>;
  credentials: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceApiKey {
  id: string;
  workspace_id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
  last_used_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWebhook {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceIntegrations() {
  const [integrations, setIntegrations] = useState<WorkspaceIntegration[]>([]);
  const [apiKeys, setApiKeys] = useState<WorkspaceApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WorkspaceWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  const fetchIntegrations = useCallback(async () => {
    if (!currentWorkspace || !user) return;

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('workspace_integrations')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (fetchError) throw fetchError;
      setIntegrations(data || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch integrations');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, user]);

  const fetchApiKeys = useCallback(async () => {
    if (!currentWorkspace || !user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('workspace_api_keys')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (fetchError) throw fetchError;
      setApiKeys(data || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys');
    }
  }, [currentWorkspace, user]);

  const fetchWebhooks = useCallback(async () => {
    if (!currentWorkspace || !user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('workspace_webhooks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (fetchError) throw fetchError;
      setWebhooks(data || []);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch webhooks');
    }
  }, [currentWorkspace, user]);

  const createIntegration = useCallback(async (
    type: string,
    name: string,
    config: Record<string, any> = {},
    credentials: Record<string, any> = {}
  ) => {
    if (!currentWorkspace || !user) return null;

    try {
      const { data, error } = await supabase
        .from('workspace_integrations')
        .insert({
          workspace_id: currentWorkspace.id,
          integration_type: type,
          name,
          config,
          credentials,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchIntegrations();
      toast({
        title: "Integration Created",
        description: `${name} integration has been configured.`,
      });

      return data;
    } catch (err) {
      console.error('Error creating integration:', err);
      toast({
        title: "Error",
        description: "Failed to create integration.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentWorkspace, user, fetchIntegrations]);

  const generateApiKey = useCallback(async (name: string, permissions = { read: true, write: false, admin: false }) => {
    if (!currentWorkspace || !user) return null;

    try {
      // Generate the API key using the database function
      const { data: keyData, error: keyError } = await supabase.rpc('generate_api_key');
      if (keyError) throw keyError;

      const apiKey = keyData as string;
      const keyHash = btoa(apiKey); // Simple encoding, should use proper hashing in production
      const keyPreview = apiKey.substring(0, 8) + '...';

      const { data, error } = await supabase
        .from('workspace_api_keys')
        .insert({
          workspace_id: currentWorkspace.id,
          name,
          key_hash: keyHash,
          key_preview: keyPreview,
          permissions,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchApiKeys();

      toast({
        title: "API Key Generated",
        description: "Your API key has been generated. Make sure to copy it now as it won't be shown again.",
      });

      return { ...data, key: apiKey }; // Return the actual key only once
    } catch (err) {
      console.error('Error generating API key:', err);
      toast({
        title: "Error",
        description: "Failed to generate API key.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentWorkspace, user, fetchApiKeys]);

  const createWebhook = useCallback(async (
    name: string,
    url: string,
    events: string[] = [],
    secret?: string
  ) => {
    if (!currentWorkspace || !user) return null;

    try {
      const { data, error } = await supabase
        .from('workspace_webhooks')
        .insert({
          workspace_id: currentWorkspace.id,
          name,
          url,
          events,
          secret,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchWebhooks();
      toast({
        title: "Webhook Created",
        description: `Webhook "${name}" has been created.`,
      });

      return data;
    } catch (err) {
      console.error('Error creating webhook:', err);
      toast({
        title: "Error",
        description: "Failed to create webhook.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentWorkspace, user, fetchWebhooks]);

  const deleteIntegration = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workspace_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchIntegrations();
      toast({
        title: "Integration Deleted",
        description: "Integration has been removed.",
      });
    } catch (err) {
      console.error('Error deleting integration:', err);
      toast({
        title: "Error",
        description: "Failed to delete integration.",
        variant: "destructive",
      });
    }
  }, [fetchIntegrations]);

  const deleteApiKey = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workspace_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchApiKeys();
      toast({
        title: "API Key Deleted",
        description: "API key has been revoked.",
      });
    } catch (err) {
      console.error('Error deleting API key:', err);
      toast({
        title: "Error",
        description: "Failed to delete API key.",
        variant: "destructive",
      });
    }
  }, [fetchApiKeys]);

  const deleteWebhook = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('workspace_webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchWebhooks();
      toast({
        title: "Webhook Deleted",
        description: "Webhook has been removed.",
      });
    } catch (err) {
      console.error('Error deleting webhook:', err);
      toast({
        title: "Error",
        description: "Failed to delete webhook.",
        variant: "destructive",
      });
    }
  }, [fetchWebhooks]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchIntegrations();
      fetchApiKeys();
      fetchWebhooks();
    }
  }, [currentWorkspace, fetchIntegrations, fetchApiKeys, fetchWebhooks]);

  return {
    integrations,
    apiKeys,
    webhooks,
    loading,
    error,
    createIntegration,
    generateApiKey,
    createWebhook,
    deleteIntegration,
    deleteApiKey,
    deleteWebhook,
    refetch: () => {
      fetchIntegrations();
      fetchApiKeys();
      fetchWebhooks();
    },
  };
}
