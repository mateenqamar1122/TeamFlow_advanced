import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    permissions: {
        projects: { create: boolean; read: boolean; update: boolean; delete: boolean };
        tasks: { create: boolean; read: boolean; update: boolean; delete: boolean };
        calendar: { create: boolean; read: boolean; update: boolean; delete: boolean };
        timeline: { read: boolean; update?: boolean };
        users: { invite: boolean; manage: boolean };
        workspace: { manage: boolean };
    };
    invited_by?: string;
    invited_at?: string;
    joined_at: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Use the correct profiles table from your schema
    user_profile?: {
        display_name?: string;
        bio?: string;
        avatar_url?: string;
    };
}

export interface WorkspaceInvitation {
    id: string;
    workspace_id: string;
    email: string;
    role: WorkspaceRole;
    permissions: WorkspaceMember['permissions'];
    invited_by: string;
    token: string;
    expires_at: string;
    accepted_at?: string;
    created_at: string;
    inviter_profile?: {
        display_name?: string;
        bio?: string;
    };
}

export interface InviteUserData {
    email: string;
    role: WorkspaceRole;
    message?: string;
}

// Helper function to get default permissions based on role
function getDefaultPermissions(role: WorkspaceRole): WorkspaceMember['permissions'] {
    const basePermissions = {
        projects: { create: false, read: true, update: false, delete: false },
        tasks: { create: true, read: true, update: true, delete: false },
        calendar: { create: true, read: true, update: true, delete: false },
        timeline: { read: true, update: false },
        users: { invite: false, manage: false },
        workspace: { manage: false }
    };

    switch (role) {
        case 'owner':
            return {
                projects: { create: true, read: true, update: true, delete: true },
                tasks: { create: true, read: true, update: true, delete: true },
                calendar: { create: true, read: true, update: true, delete: true },
                timeline: { read: true, update: true },
                users: { invite: true, manage: true },
                workspace: { manage: true }
            };
        case 'admin':
            return {
                projects: { create: true, read: true, update: true, delete: true },
                tasks: { create: true, read: true, update: true, delete: true },
                calendar: { create: true, read: true, update: true, delete: true },
                timeline: { read: true, update: true },
                users: { invite: true, manage: true },
                workspace: { manage: false }
            };
        case 'manager':
            return {
                projects: { create: true, read: true, update: true, delete: false },
                tasks: { create: true, read: true, update: true, delete: true },
                calendar: { create: true, read: true, update: true, delete: true },
                timeline: { read: true, update: true },
                users: { invite: true, manage: false },
                workspace: { manage: false }
            };
        case 'member':
            return {
                ...basePermissions,
                tasks: { create: true, read: true, update: true, delete: false },
                users: { invite: false, manage: false }
            };
        case 'guest':
            return {
                projects: { create: false, read: true, update: false, delete: false },
                tasks: { create: false, read: true, update: false, delete: false },
                calendar: { create: false, read: true, update: false, delete: false },
                timeline: { read: true, update: false },
                users: { invite: false, manage: false },
                workspace: { manage: false }
            };
        default:
            return basePermissions;
    }
}

export function useWorkspaceMembers(workspaceId?: string) {
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchMembers = useCallback(async () => {
        if (!workspaceId) return;

        setLoading(true);
        setError(null);

        try {
            // Get workspace members first
            const { data: membersData, error: membersError } = await supabase
                .from('workspace_members')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (membersError) throw membersError;

            if (!membersData || membersData.length === 0) {
                setMembers([]);
                return;
            }

            // Get user IDs for profile lookup
            const userIds = membersData.map(member => member.user_id);

            // Get profiles separately to avoid relation issues
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, display_name, bio, avatar_url')
                .in('id', userIds);

            if (profilesError) {
                console.warn('Error fetching profiles:', profilesError);
            }

            // Create profiles map for easier lookup
            const profilesMap = new Map();
            (profilesData || []).forEach(profile => {
                profilesMap.set(profile.id, profile);
            });

            const formattedMembers: WorkspaceMember[] = membersData.map(member => {
                const profile = profilesMap.get(member.user_id);

                return {
                    ...member,
                    role: member.role as WorkspaceRole,
                    permissions: (member.permissions as WorkspaceMember['permissions']) || getDefaultPermissions(member.role as WorkspaceRole),
                    user_profile: {
                        display_name: profile?.display_name || 'User',
                        bio: profile?.bio,
                        avatar_url: profile?.avatar_url
                    }
                };
            });

            setMembers(formattedMembers);
        } catch (err) {
            console.error('Error fetching workspace members:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch members');
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    const fetchInvitations = useCallback(async () => {
        if (!workspaceId) return;

        try {
            // First get the invitations without the foreign key join
            const { data: invitationsData, error: queryError } = await supabase
                .from('workspace_invitations')
                .select(`
                    id,
                    workspace_id,
                    email,
                    role,
                    permissions,
                    invited_by,
                    token,
                    expires_at,
                    accepted_at,
                    created_at
                `)
                .eq('workspace_id', workspaceId)
                .is('accepted_at', null)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (queryError) throw queryError;

            // Then get inviter profiles separately
            const inviterIds = [...new Set((invitationsData || []).map(inv => inv.invited_by).filter(Boolean))];

            let inviterProfiles: Record<string, { display_name?: string; bio?: string }> = {};
            if (inviterIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, display_name, bio')
                    .in('id', inviterIds);

                if (!profileError && profiles) {
                    inviterProfiles = profiles.reduce((acc, profile) => {
                        acc[profile.id] = profile;
                        return acc;
                    }, {} as Record<string, { display_name?: string; bio?: string }>);
                }
            }

            // Combine the data
            const formattedInvitations: WorkspaceInvitation[] = (invitationsData || []).map(invitation => ({
                ...invitation,
                role: invitation.role as WorkspaceRole,
                permissions: (invitation.permissions as WorkspaceMember['permissions']) || getDefaultPermissions(invitation.role as WorkspaceRole),
                inviter_profile: invitation.invited_by ? inviterProfiles[invitation.invited_by] : undefined
            }));

            setInvitations(formattedInvitations);
        } catch (err) {
            console.error('Error fetching invitations:', err);
        }
    }, [workspaceId]);

    const inviteUser = useCallback(async (data: InviteUserData): Promise<boolean> => {
        if (!workspaceId || !user) {
            setError('Missing workspace ID or user');
            return false;
        }

        try {
            setLoading(true);

            // Get workspace and current user details using correct table names
            const { data: workspace, error: workspaceError } = await supabase
                .from('workspaces')
                .select('name')
                .eq('id', workspaceId)
                .single();

            if (workspaceError) throw workspaceError;

            const { data: inviterProfile, error: profileError } = await supabase
                .from('profiles')
                .select('display_name, id')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError;
            }

            // Prepare invitation data with validation
            const invitationPayload = {
                workspace_id: workspaceId,
                email: data.email,
                role: data.role,
                invited_by: user.id,
                workspaceName: workspace.name,
                inviterName: inviterProfile?.display_name || user.email || 'Team Member',
                message: data.message
            };

            // Debug logging to track the data being sent
            console.log('Sending invitation with payload:', JSON.stringify(invitationPayload, null, 2));
            console.log('workspaceId being sent:', workspaceId);
            console.log('workspaceId type:', typeof workspaceId);

            // Validate workspaceId before sending
            if (!workspaceId) {
                throw new Error('workspaceId is missing or null');
            }

            // Call the edge function to send invitation
            const { data: result, error: inviteError } = await supabase.functions.invoke('send-invitation', {
                body: invitationPayload
            });

            if (inviteError) throw inviteError;

            if (!result?.success) {
                throw new Error(result?.error || 'Failed to send invitation');
            }

            await fetchInvitations();

            toast({
                title: "Invitation Sent",
                description: `Invitation sent successfully to ${data.email}`,
            });

            return true;
        } catch (err) {
            console.error('Error inviting user:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to invite user';
            setError(errorMessage);

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });

            return false;
        } finally {
            setLoading(false);
        }
    }, [workspaceId, user, fetchInvitations, toast]);

    const resendInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
        if (!workspaceId || !user) return false;

        try {
            setLoading(true);

            // Get invitation details
            const { data: invitation, error: invitationError } = await supabase
                .from('workspace_invitations')
                .select('*')
                .eq('id', invitationId)
                .maybeSingle();

            if (invitationError && invitationError.code !== 'PGRST116') {
                throw invitationError;
            }

            if (!invitation) {
                throw new Error('Invitation not found');
            }

            // Get workspace name separately
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('name')
                .eq('id', invitation.workspace_id)
                .single();

            // Get inviter profile separately
            const { data: inviterProfile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', invitation.invited_by)
                .maybeSingle();

            // Call edge function to resend
            const { data: result, error: resendError } = await supabase.functions.invoke('send-invitation', {
                body: {
                    workspace_id: workspaceId,
                    email: invitation.email,
                    role: invitation.role,
                    invited_by: user.id,
                    workspaceName: workspace?.name || 'Workspace',
                    inviterName: inviterProfile?.display_name || user.email || 'Team Member',
                    resend: true
                }
            });

            if (resendError) throw resendError;

            if (!result?.success) {
                throw new Error(result?.error || 'Failed to resend invitation');
            }

            toast({
                title: "Invitation Resent",
                description: `Invitation resent to ${invitation.email}`,
            });

            return true;
        } catch (err) {
            console.error('Error resending invitation:', err);
            setError(err instanceof Error ? err.message : 'Failed to resend invitation');
            return false;
        } finally {
            setLoading(false);
        }
    }, [workspaceId, user, toast]);

    const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('workspace_invitations')
                .delete()
                .eq('id', invitationId);

            if (error) throw error;

            await fetchInvitations();

            toast({
                title: "Invitation Cancelled",
                description: "The invitation has been cancelled",
            });

            return true;
        } catch (err) {
            console.error('Error cancelling invitation:', err);
            setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
            return false;
        }
    }, [fetchInvitations, toast]);

    const updateMemberRole = useCallback(async (memberId: string, role: WorkspaceRole): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('workspace_members')
                .update({
                    role,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memberId);

            if (error) throw error;

            await fetchMembers();

            toast({
                title: "Role Updated",
                description: "Member role has been updated successfully",
            });

            return true;
        } catch (err) {
            console.error('Error updating member role:', err);
            setError(err instanceof Error ? err.message : 'Failed to update member role');
            return false;
        }
    }, [fetchMembers, toast]);

    const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('workspace_members')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memberId);

            if (error) throw error;

            await fetchMembers();

            toast({
                title: "Member Removed",
                description: "The member has been removed from the workspace",
            });

            return true;
        } catch (err) {
            console.error('Error removing member:', err);
            setError(err instanceof Error ? err.message : 'Failed to remove member');
            return false;
        }
    }, [fetchMembers, toast]);

    const updateMemberPermissions = useCallback(async (
        memberId: string,
        permissions: WorkspaceMember['permissions']
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('workspace_members')
                .update({
                    permissions,
                    updated_at: new Date().toISOString()
                })
                .eq('id', memberId);

            if (error) throw error;

            await fetchMembers();

            toast({
                title: "Permissions Updated",
                description: "Member permissions have been updated successfully",
            });

            return true;
        } catch (err) {
            console.error('Error updating member permissions:', err);
            setError(err instanceof Error ? err.message : 'Failed to update permissions');
            return false;
        }
    }, [fetchMembers, toast]);

    useEffect(() => {
        if (workspaceId) {
            fetchMembers();
            fetchInvitations();
        }
    }, [workspaceId, fetchMembers, fetchInvitations]);

    return {
        members,
        invitations,
        loading,
        error,
        inviteUser,
        resendInvitation,
        cancelInvitation,
        updateMemberRole,
        removeMember,
        updateMemberPermissions,
        fetchMembers,
        fetchInvitations
    };
}
