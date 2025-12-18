import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WorkspaceRole = 'admin' | 'project_manager' | 'developer';

export interface WorkspacePermissions {
  projects: { create: boolean; read: boolean; update: boolean; delete: boolean };
  tasks: { create: boolean; read: boolean; update: boolean; delete: boolean };
  calendar: { create: boolean; read: boolean; update: boolean; delete: boolean };
  timeline: { read: boolean; update?: boolean };
  users: { invite: boolean; manage: boolean };
  workspace: { manage: boolean };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  title?: string;
  department?: string;
  phone?: string;
  timezone: string;
  notification_preferences: {
    email: boolean;
    in_app: boolean;
    push: boolean;
    task_assigned: boolean;
    task_due: boolean;
    project_updates: boolean;
    workspace_invites: boolean;
  };
  onboarding_completed: boolean;
  onboarding_step: number;
  last_active: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  personal_message?: string;
  created_at: string;
}

export interface OnboardingStep {
  id: string;
  user_id: string;
  step_name: string;
  step_number: number;
  completed: boolean;
  completed_at?: string;
  data: Record<string, any>;
}

const getRolePermissions = (role: WorkspaceRole): WorkspacePermissions => {
  const permissions: Record<WorkspaceRole, WorkspacePermissions> = {
    admin: {
      projects: { create: true, read: true, update: true, delete: true },
      tasks: { create: true, read: true, update: true, delete: true },
      calendar: { create: true, read: true, update: true, delete: true },
      timeline: { read: true, update: true },
      users: { invite: true, manage: true },
      workspace: { manage: true }
    },
    project_manager: {
      projects: { create: true, read: true, update: true, delete: false },
      tasks: { create: true, read: true, update: true, delete: true },
      calendar: { create: true, read: true, update: true, delete: false },
      timeline: { read: true, update: true },
      users: { invite: true, manage: false },
      workspace: { manage: false }
    },
    developer: {
      projects: { create: false, read: true, update: false, delete: false },
      tasks: { create: true, read: true, update: true, delete: false },
      calendar: { create: true, read: true, update: true, delete: false },
      timeline: { read: true, update: false },
      users: { invite: false, manage: false },
      workspace: { manage: false }
    }
  };

  return permissions[role];
};

export function useUserManagement() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setUserProfile(data);
      } else {
        // Create profile if it doesn't exist
        await createUserProfile();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Create user profile
  const createUserProfile = async () => {
    if (!user) return;

    try {
      const profileData = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);

      // Initialize onboarding
      await initializeOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  };

  // Initialize onboarding
  const initializeOnboarding = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.rpc('initialize_user_onboarding', {
        user_id: user.id
      });

      if (error) throw error;
      await fetchOnboardingSteps();
    } catch (err) {
      console.error('Failed to initialize onboarding:', err);
    }
  };

  // Fetch onboarding steps
  const fetchOnboardingSteps = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('user_id', user.id)
        .order('step_number');

      if (error) throw error;
      setOnboardingSteps(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch onboarding steps');
    }
  }, [user?.id]);

  // Complete onboarding step
  const completeOnboardingStep = async (stepName: string, data?: Record<string, any>) => {
    if (!user?.id) return false;

    try {
      const { data: result, error } = await supabase.rpc('complete_onboarding_step', {
        p_user_id: user.id,
        p_step_name: stepName,
        p_data: data || {}
      });

      if (error) throw error;

      // Refresh data
      await fetchOnboardingSteps();
      await fetchUserProfile();

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding step');
      return false;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    }
  };

  // Get workspace members with profiles
  const getWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          user_profile:user_profiles(*)
        `)
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspace members');
      return [];
    }
  };

  // Invite user to workspace
  const inviteUserToWorkspace = async (
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
    personalMessage?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('invite_user_to_workspace', {
        p_workspace_id: workspaceId,
        p_email: email.toLowerCase(),
        p_role: role,
        p_personal_message: personalMessage || null
      });

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
      return null;
    }
  };

  // Accept workspace invitation
  const acceptWorkspaceInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_workspace_invitation', {
        p_token: token
      });

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      return null;
    }
  };

  // Get workspace invitations
  const getWorkspaceInvitations = async (workspaceId: string): Promise<WorkspaceInvitation[]> => {
    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
      return [];
    }
  };

  // Update workspace member role
  const updateMemberRole = async (memberId: string, role: WorkspaceRole) => {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({
          role,
          permissions: getRolePermissions(role),
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
      return null;
    }
  };

  // Remove workspace member
  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      return false;
    }
  };

  // Check if user has permission
  const hasPermission = (
    member: WorkspaceMember | null,
    resource: keyof WorkspacePermissions,
    action: string
  ): boolean => {
    if (!member || !member.permissions) return false;

    const resourcePermissions = member.permissions[resource] as any;
    return resourcePermissions?.[action] === true;
  };

  // Get current user's membership in workspace
  const getCurrentMembership = async (workspaceId: string): Promise<WorkspaceMember | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (err) {
      return null;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
      fetchOnboardingSteps();
    }
  }, [user?.id, fetchUserProfile, fetchOnboardingSteps]);

  return {
    userProfile,
    onboardingSteps,
    loading,
    error,
    setError,

    // Profile management
    updateUserProfile,
    createUserProfile,

    // Onboarding
    completeOnboardingStep,
    initializeOnboarding,

    // Team management
    getWorkspaceMembers,
    inviteUserToWorkspace,
    acceptWorkspaceInvitation,
    getWorkspaceInvitations,
    updateMemberRole,
    removeMember,
    getCurrentMembership,

    // Permissions
    hasPermission,
    getRolePermissions
  };
}
