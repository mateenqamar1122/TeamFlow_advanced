import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeUuid } from '@/lib/utils';

export interface TimeEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  task_id?: string;
  project_id?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  is_billable: boolean;
  hourly_rate?: number;
  tags: string[];
  status: 'running' | 'stopped' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface TimeTrackingSettings {
  id: string;
  workspace_id: string;
  default_hourly_rate?: number;
  require_description: boolean;
  allow_manual_time: boolean;
  round_to_minutes: number;
  working_hours: any;
  timezone: string;
}

export interface TimeEntryTemplate {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description?: string;
  default_duration_minutes?: number;
  tags: string[];
  is_billable: boolean;
  hourly_rate?: number;
  is_shared: boolean;
}

export interface TimeReport {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  report_type: 'summary' | 'detailed' | 'project' | 'user' | 'billable';
  date_range_start: string;
  date_range_end: string;
  filters: any;
  data?: any;
  total_hours?: number;
  total_billable_hours?: number;
  total_amount?: number;
}

export const useTimeTracking = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [settings, setSettings] = useState<TimeTrackingSettings | null>(null);
  const [templates, setTemplates] = useState<TimeEntryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch time entries for current workspace
  const fetchTimeEntries = useCallback(async (filters?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
    project_id?: string;
    task_id?: string;
  }) => {
    if (!currentWorkspace?.id || !user?.id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(id, title),
          project:projects(id, name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('start_time', { ascending: false });

      if (filters?.start_date) {
        query = query.gte('start_time', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('start_time', filters.end_date);
      }
      if (filters?.user_id && filters.user_id !== 'all') {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.project_id && filters.project_id !== 'all') {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters?.task_id && filters.task_id !== 'all') {
        query = query.eq('task_id', filters.task_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (err: any) {
      console.error('Error fetching time entries:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch time entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast]);

  // Fetch current running timer
  const fetchCurrentEntry = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .eq('status', 'running')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentEntry(data || null);
    } catch (err: any) {
      console.error('Error fetching current entry:', err);
    }
  }, [currentWorkspace?.id, user?.id]);

  // Start timer
  const startTimer = useCallback(async (data: {
    description?: string;
    task_id?: string;
    project_id?: string;
    tags?: string[];
    is_billable?: boolean;
    hourly_rate?: number;
  }) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      setLoading(true);

      const { data: entry, error } = await supabase
        .from('time_entries')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          description: data.description,
          task_id: sanitizeUuid(data.task_id),
          project_id: sanitizeUuid(data.project_id),
          start_time: new Date().toISOString(),
          status: 'running',
          tags: data.tags || [],
          is_billable: data.is_billable || false,
          hourly_rate: data.hourly_rate,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(entry);
      toast({
        title: 'Timer Started',
        description: 'Time tracking has begun',
      });

      return entry;
    } catch (err: any) {
      console.error('Error starting timer:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to start timer',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast]);

  // Stop timer
  const stopTimer = useCallback(async (entryId?: string) => {
    const targetEntry = entryId ?
      timeEntries.find(e => e.id === entryId) :
      currentEntry;

    if (!targetEntry) return null;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
          status: 'stopped',
        })
        .eq('id', targetEntry.id)
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(null);
      await fetchTimeEntries();

      toast({
        title: 'Timer Stopped',
        description: 'Time entry has been saved',
      });

      return data;
    } catch (err: any) {
      console.error('Error stopping timer:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to stop timer',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentEntry, timeEntries, toast, fetchTimeEntries]);

  // Update time entry
  const updateTimeEntry = useCallback(async (
    entryId: string,
    updates: Partial<TimeEntry>
  ) => {
    try {
      setLoading(true);

      // Clean up empty string UUIDs
      const cleanedUpdates = { ...updates };
      if (cleanedUpdates.task_id !== undefined) {
        cleanedUpdates.task_id = sanitizeUuid(cleanedUpdates.task_id);
      }
      if (cleanedUpdates.project_id !== undefined) {
        cleanedUpdates.project_id = sanitizeUuid(cleanedUpdates.project_id);
      }

      const { data, error } = await supabase
        .from('time_entries')
        .update(cleanedUpdates)
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;

      await fetchTimeEntries();
      toast({
        title: 'Time Entry Updated',
        description: 'Changes have been saved',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating time entry:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to update time entry',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchTimeEntries]);

  // Delete time entry
  const deleteTimeEntry = useCallback(async (entryId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      await fetchTimeEntries();
      toast({
        title: 'Time Entry Deleted',
        description: 'Entry has been removed',
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting time entry:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to delete time entry',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchTimeEntries]);

  // Fetch time tracking settings
  const fetchSettings = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_tracking_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSettings(data || null);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    }
  }, [currentWorkspace?.id]);

  // Update time tracking settings
  const updateSettings = useCallback(async (updates: Partial<TimeTrackingSettings>) => {
    if (!currentWorkspace?.id) return null;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('time_tracking_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: 'Settings Updated',
        description: 'Time tracking settings have been saved',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_entry_templates')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    }
  }, [currentWorkspace?.id]);

  // Create template
  const createTemplate = useCallback(async (
    template: Omit<TimeEntryTemplate, 'id' | 'workspace_id' | 'user_id'>
  ) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('time_entry_templates')
        .insert({
          ...template,
          workspace_id: currentWorkspace.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: 'Template Created',
        description: 'Time entry template has been saved',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating template:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast, fetchTemplates]);

  // Generate time report
  const generateReport = useCallback(async (config: {
    name: string;
    report_type: 'summary' | 'detailed' | 'project' | 'user' | 'billable';
    date_range_start: string;
    date_range_end: string;
    filters?: any;
  }) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      setLoading(true);

      // Fetch time entries for the report
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(id, title),
          project:projects(id, name),
          user:profiles(id, full_name, email)
          user:profiles(id, full_name, email)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .gte('start_time', config.date_range_start)
        .lte('start_time', config.date_range_end)
        .not('end_time', 'is', null);

      if (config.filters?.user_ids?.length > 0) {
        query = query.in('user_id', config.filters.user_ids);
      }
      if (config.filters?.project_ids?.length > 0) {
        query = query.in('project_id', config.filters.project_ids);
      }

      const { data: entries, error: entriesError } = await query;
      if (entriesError) throw entriesError;

      // Calculate totals
      const totalHours = entries?.reduce((sum, entry) =>
        sum + ((entry.duration_seconds || 0) / 3600), 0) || 0;

      const totalBillableHours = entries?.reduce((sum, entry) =>
        sum + (entry.is_billable ? (entry.duration_seconds || 0) / 3600 : 0), 0) || 0;

      const totalAmount = entries?.reduce((sum, entry) =>
        sum + (entry.is_billable && entry.hourly_rate ?
          ((entry.duration_seconds || 0) / 3600) * entry.hourly_rate : 0), 0) || 0;

      // Save report
      const { data, error } = await supabase
        .from('time_reports')
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: config.name,
          report_type: config.report_type,
          date_range_start: config.date_range_start,
          date_range_end: config.date_range_end,
          filters: config.filters || {},
          data: entries,
          total_hours: totalHours,
          total_billable_hours: totalBillableHours,
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Report Generated',
        description: 'Time tracking report has been created',
      });

      return data;
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast]);

  // Initialize data
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchTimeEntries();
      fetchCurrentEntry();
      fetchSettings();
      fetchTemplates();
    }
  }, [currentWorkspace?.id, fetchTimeEntries, fetchCurrentEntry, fetchSettings, fetchTemplates]);

  return {
    // State
    timeEntries,
    currentEntry,
    settings,
    templates,
    loading,
    error,

    // Actions
    startTimer,
    stopTimer,
    updateTimeEntry,
    deleteTimeEntry,
    updateSettings,
    createTemplate,
    generateReport,

    // Fetch functions
    fetchTimeEntries,
    fetchCurrentEntry,
    fetchSettings,
    fetchTemplates,
  };
};
