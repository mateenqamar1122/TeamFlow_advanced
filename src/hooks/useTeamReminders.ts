import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeUuid } from '@/lib/utils';

export interface Reminder {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  description?: string;
  reminder_type: 'task_deadline' | 'meeting' | 'project_milestone' | 'custom' | 'time_tracking' |
                 'daily_standup' | 'weekly_review' | 'sprint_planning' | 'retrospective';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reminder_datetime: string;
  timezone: string;
  recurring_pattern?: any;
  recipient_type: 'individual' | 'team' | 'workspace' | 'role';
  recipients: any;
  related_entity_type?: 'task' | 'project' | 'meeting' | 'milestone';
  related_entity_id?: string;
  notification_channels: string[];
  status: 'active' | 'sent' | 'cancelled' | 'expired';
  sent_at?: string;
  acknowledged_by: string[];
  snoozed_until?: string;
  snooze_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReminderTemplate {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description?: string;
  reminder_type: string;
  template_content: any;
  default_priority: 'low' | 'medium' | 'high' | 'urgent';
  default_channels: string[];
  default_advance_time: string;
  is_shared: boolean;
  usage_count: number;
}

export interface TeamAvailability {
  id: string;
  workspace_id: string;
  user_id: string;
  working_hours: any;
  timezone: string;
  notification_preferences: any;
  status: 'available' | 'busy' | 'away' | 'do_not_disturb' | 'offline';
  status_message?: string;
  status_until?: string;
}

export interface ReminderDelivery {
  id: string;
  reminder_id: string;
  user_id: string;
  channel: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged';
  sent_at?: string;
  delivered_at?: string;
  acknowledged_at?: string;
  failure_reason?: string;
  metadata: any;
}

export const useTeamReminders = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<TeamAvailability[]>([]);
  const [myAvailability, setMyAvailability] = useState<TeamAvailability | null>(null);
  const [deliveries, setDeliveries] = useState<ReminderDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reminders
  const fetchReminders = useCallback(async (filters?: {
    status?: string[];
    reminder_type?: string[];
    start_date?: string;
    end_date?: string;
  }) => {
    if (!currentWorkspace?.id || !user?.id) return;

    try {
      setLoading(true);

      // Use basic query with type casting to avoid TypeScript issues
      let query = (supabase as any)
        .from('reminders')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('reminder_datetime', { ascending: true });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.reminder_type?.length) {
        query = query.in('reminder_type', filters.reminder_type);
      }
      if (filters?.start_date) {
        query = query.gte('reminder_datetime', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('reminder_datetime', filters.end_date);
      }

      const { data: remindersData, error: remindersError } = await query;

      if (remindersError) {
        console.error('Error fetching reminders:', remindersError);
        throw remindersError;
      }

      // Fetch profiles separately if we have data
      let data = remindersData;
      if (remindersData && remindersData.length > 0) {
        const creatorIds = [...new Set(remindersData.map((item: any) => item.created_by))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', creatorIds as string[]);

        if (!profilesError && profilesData) {
          // Merge the data
          data = remindersData.map((item: any) => ({
            ...item,
            creator: profilesData.find(profile => profile.id === item.created_by) || null
          }));
        }
      }

      setReminders(data || []);
    } catch (err: any) {
      console.error('Error fetching reminders:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch reminders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast]);

  // Create reminder
  const createReminder = useCallback(async (
    reminderData: Omit<Reminder, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'updated_at' | 'status' | 'sent_at' | 'acknowledged_by' | 'snooze_count'>
  ) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      setLoading(true);

      // Clean up empty string UUIDs
      const cleanedData = { ...reminderData };
      cleanedData.related_entity_id = sanitizeUuid(cleanedData.related_entity_id);

    const { data, error } = await (supabase as any)
      .from('reminders')
      .insert({
          ...cleanedData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          status: 'active',
          acknowledged_by: [],
          snooze_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchReminders();
      toast({
        title: 'Reminder Created',
        description: 'Your reminder has been scheduled',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating reminder:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to create reminder',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast, fetchReminders]);

  // Update reminder
  const updateReminder = useCallback(async (
    reminderId: string,
    updates: Partial<Reminder>
  ) => {
    try {
      setLoading(true);

      // Clean up empty string UUIDs
      const cleanedUpdates = { ...updates };
      if (cleanedUpdates.related_entity_id !== undefined) {
        cleanedUpdates.related_entity_id = sanitizeUuid(cleanedUpdates.related_entity_id);
      }

    const { data, error } = await (supabase as any)
      .from('reminders')
      .update(cleanedUpdates)
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      await fetchReminders();
      toast({
        title: 'Reminder Updated',
        description: 'Changes have been saved',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating reminder:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to update reminder',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchReminders]);

  // Delete reminder
  const deleteReminder = useCallback(async (reminderId: string) => {
    try {
      setLoading(true);

    const { error } = await (supabase as any)
      .from('reminders')
      .delete()
      .eq('id', reminderId);

      if (error) throw error;

      await fetchReminders();
      toast({
        title: 'Reminder Deleted',
        description: 'Reminder has been removed',
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting reminder:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to delete reminder',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchReminders]);

  // Acknowledge reminder
  const acknowledgeReminder = useCallback(async (reminderId: string) => {
    if (!user?.id) return null;

    try {
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return null;

      const acknowledgedBy = [...reminder.acknowledged_by];
      if (!acknowledgedBy.includes(user.id)) {
        acknowledgedBy.push(user.id);
      }

    const { data, error } = await (supabase as any)
      .from('reminders')
      .update({ acknowledged_by: acknowledgedBy })
      .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;

      await fetchReminders();
      toast({
        title: 'Reminder Acknowledged',
        description: 'Thank you for confirming',
      });

      return data;
    } catch (err: any) {
      console.error('Error acknowledging reminder:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge reminder',
        variant: 'destructive',
      });
      return null;
    }
  }, [user?.id, reminders, toast, fetchReminders]);

  // Snooze reminder
  const snoozeReminder = useCallback(async (
    reminderId: string,
    snoozeMinutes: number
  ) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeMinutes);

      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) return null;

    const { data, error } = await (supabase as any)
      .from('reminders')
      .update({
        snoozed_until: snoozeUntil.toISOString(),
        snooze_count: reminder.snooze_count + 1,
      })
      .eq('id', reminderId)
      .select()
      .single();

      if (error) throw error;

      await fetchReminders();
      toast({
        title: 'Reminder Snoozed',
        description: `Reminder will reappear in ${snoozeMinutes} minutes`,
      });

      return data;
    } catch (err: any) {
      console.error('Error snoozing reminder:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to snooze reminder',
        variant: 'destructive',
      });
      return null;
    }
  }, [reminders, toast, fetchReminders]);

  // Fetch reminder templates
  const fetchTemplates = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
    const { data, error } = await (supabase as any)
      .from('reminder_templates')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    }
  }, [currentWorkspace?.id]);

  // Create reminder template
  const createTemplate = useCallback(async (
    templateData: Omit<ReminderTemplate, 'id' | 'workspace_id' | 'created_by' | 'usage_count'>
  ) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      setLoading(true);

    const { data, error } = await (supabase as any)
      .from('reminder_templates')
      .insert({
          ...templateData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: 'Template Created',
        description: 'Reminder template has been saved',
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

  // Fetch team availability
  const fetchTeamAvailability = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      // Use basic query with type casting to avoid TypeScript issues
      const { data: availabilityData, error: availabilityError } = await (supabase as any)
        .from('team_availability')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (availabilityError) {
        console.error('Error fetching team availability:', availabilityError);
        throw availabilityError;
      }

      // Fetch profiles separately if we have data
      let data = availabilityData;
      if (availabilityData && availabilityData.length > 0) {
        const userIds = availabilityData.map((item: any) => item.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds as string[]);

        if (!profilesError && profilesData) {
          // Merge the data
          data = availabilityData.map((item: any) => ({
            ...item,
            user: profilesData.find(profile => profile.id === item.user_id) || null
          }));
        }
      }

      setTeamAvailability(data || []);
    } catch (err: any) {
      console.error('Error fetching team availability:', err);
    }
  }, [currentWorkspace?.id]);

  // Fetch my availability
  const fetchMyAvailability = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    try {
    const { data, error } = await (supabase as any)
      .from('team_availability')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', user.id)
      .single();

      if (error && error.code !== 'PGRST116') throw error;
      setMyAvailability(data || null);
    } catch (err: any) {
      console.error('Error fetching my availability:', err);
    }
  }, [currentWorkspace?.id, user?.id]);

  // Update my availability
  const updateMyAvailability = useCallback(async (
    updates: Partial<TeamAvailability>
  ) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      setLoading(true);

    const { data, error } = await (supabase as any)
      .from('team_availability')
      .upsert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (error) throw error;

      setMyAvailability(data);
      await fetchTeamAvailability();
      toast({
        title: 'Availability Updated',
        description: 'Your availability settings have been saved',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating availability:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to update availability',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, toast, fetchTeamAvailability]);

  // Create quick reminders for common scenarios
  const createQuickReminder = useCallback(async (type: string, data: any) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    let reminderData: any = {
      reminder_type: type,
      priority: 'medium',
      recipient_type: 'individual',
      recipients: [user.id],
      notification_channels: ['in_app'],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    switch (type) {
      case 'task_deadline':
        reminderData = {
          ...reminderData,
          title: `Task deadline reminder: ${data.task_title}`,
          description: `Don't forget about your task "${data.task_title}" due soon.`,
          related_entity_type: 'task',
          related_entity_id: data.task_id,
          reminder_datetime: data.due_date,
          priority: 'high',
        };
        break;

      case 'daily_standup':
        reminderData = {
          ...reminderData,
          title: 'Daily Standup Meeting',
          description: 'Time for your daily standup meeting with the team.',
          reminder_datetime: data.datetime,
          recipient_type: 'team',
          recipients: data.team_members || [],
          recurring_pattern: {
            type: 'daily',
            interval_days: 1,
            end_date: null,
          },
        };
        break;

      case 'time_tracking':
        reminderData = {
          ...reminderData,
          title: 'Time Tracking Reminder',
          description: 'Remember to track your time for the current task.',
          reminder_datetime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          priority: 'low',
        };
        break;

      default:
        return null;
    }

    return await createReminder(reminderData);
  }, [currentWorkspace?.id, user?.id, createReminder]);

  // Get upcoming reminders (next 24 hours)
  const getUpcomingReminders = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return reminders.filter(reminder => {
      const reminderTime = new Date(reminder.reminder_datetime);
      return reminder.status === 'active' &&
             reminderTime >= now &&
             reminderTime <= tomorrow &&
             (!reminder.snoozed_until || new Date(reminder.snoozed_until) <= now);
    });
  }, [reminders]);

  // Get overdue reminders
  const getOverdueReminders = useCallback(() => {
    const now = new Date();

    return reminders.filter(reminder => {
      const reminderTime = new Date(reminder.reminder_datetime);
      return reminder.status === 'active' &&
             reminderTime < now &&
             (!reminder.snoozed_until || new Date(reminder.snoozed_until) <= now);
    });
  }, [reminders]);

  // Initialize data
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchReminders();
      fetchTemplates();
      fetchTeamAvailability();
      fetchMyAvailability();
    }
  }, [currentWorkspace?.id, fetchReminders, fetchTemplates, fetchTeamAvailability, fetchMyAvailability]);

  return {
    // State
    reminders,
    templates,
    teamAvailability,
    myAvailability,
    deliveries,
    loading,
    error,

    // Actions
    createReminder,
    updateReminder,
    deleteReminder,
    acknowledgeReminder,
    snoozeReminder,
    createTemplate,
    updateMyAvailability,
    createQuickReminder,

    // Fetch functions
    fetchReminders,
    fetchTemplates,
    fetchTeamAvailability,
    fetchMyAvailability,

    // Computed values
    upcomingReminders: getUpcomingReminders(),
    overdueReminders: getOverdueReminders(),
  };
};
