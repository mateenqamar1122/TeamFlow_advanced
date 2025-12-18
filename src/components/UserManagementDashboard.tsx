import React, { useState, useEffect } from 'react';
import { useUserManagement, type WorkspaceMember, type WorkspaceRole } from '@/hooks/useUserManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  UserPlus,
  MoreVertical,
  Mail,
  Shield,
  Settings,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserManagementDashboardProps {
  workspaceId: string;
}

interface InviteForm {
  email: string;
  role: WorkspaceRole;
  personalMessage: string;
}

export function UserManagementDashboard({ workspaceId }: UserManagementDashboardProps) {
  const {
    getWorkspaceMembers,
    inviteUserToWorkspace,
    getWorkspaceInvitations,
    updateMemberRole,
    removeMember,
    getCurrentMembership,
    hasPermission,
    getRolePermissions,
    loading,
    error
  } = useUserManagement();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [currentMember, setCurrentMember] = useState<WorkspaceMember | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    role: 'developer',
    personalMessage: ''
  });

  const roleLabels: Record<WorkspaceRole, string> = {
    admin: 'Admin',
    project_manager: 'Project Manager',
    developer: 'Developer'
  };

  const roleDescriptions: Record<WorkspaceRole, string> = {
    admin: 'Full access to workspace management, users, projects, and tasks',
    project_manager: 'Can create and manage projects, assign tasks, and invite team members',
    developer: 'Can work on assigned tasks, create personal tasks, and view project timelines'
  };

  const getRoleBadgeVariant = (role: WorkspaceRole) => {
    const variants = {
      admin: 'destructive',
      project_manager: 'default',
      developer: 'secondary'
    };
    return variants[role] as any;
  };

  const fetchData = async () => {
    try {
      const [membersData, invitationsData, currentMemberData] = await Promise.all([
        getWorkspaceMembers(workspaceId),
        getWorkspaceInvitations(workspaceId),
        getCurrentMembership(workspaceId)
      ]);

      setMembers(membersData);
      setInvitations(invitationsData);
      setCurrentMember(currentMemberData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workspace data",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  const handleInviteUser = async () => {
    try {
      if (!inviteForm.email || !inviteForm.role) {
        toast({
          title: "Missing Information",
          description: "Please provide email and role",
          variant: "destructive"
        });
        return;
      }

      const invitationId = await inviteUserToWorkspace(
        workspaceId,
        inviteForm.email,
        inviteForm.role,
        inviteForm.personalMessage || undefined
      );

      if (invitationId) {
        toast({
          title: "Invitation Sent",
          description: `Invitation sent to ${inviteForm.email}`
        });
        setInviteForm({ email: '', role: 'developer', personalMessage: '' });
        setInviteDialogOpen(false);
        await fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: WorkspaceRole) => {
    try {
      const success = await updateMemberRole(memberId, newRole);
      if (success) {
        toast({
          title: "Role Updated",
          description: "Member role has been updated successfully"
        });
        await fetchData();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive"
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      try {
        const success = await removeMember(memberId);
        if (success) {
          toast({
            title: "Member Removed",
            description: `${memberName} has been removed from the workspace`
          });
          await fetchData();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove member",
          variant: "destructive"
        });
      }
    }
  };

  const canManageUsers = currentMember ? hasPermission(currentMember, 'users', 'manage') : false;
  const canInviteUsers = currentMember ? hasPermission(currentMember, 'users', 'invite') : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            Manage workspace members, roles, and permissions
          </p>
        </div>
        {canInviteUsers && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this workspace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteForm.role} onValueChange={(value: WorkspaceRole) =>
                    setInviteForm({ ...inviteForm, role: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([role, label]) => (
                        <SelectItem key={role} value={role}>
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-sm text-muted-foreground">
                              {roleDescriptions[role as WorkspaceRole]}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={inviteForm.personalMessage}
                    onChange={(e) => setInviteForm({ ...inviteForm, personalMessage: e.target.value })}
                    placeholder="Add a personal message to the invitation"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleInviteUser} disabled={!inviteForm.email}>
                    Send Invitation
                  </Button>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Workspace Members ({members.length})
          </CardTitle>
          <CardDescription>
            Manage team members and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                {canManageUsers && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user_profile?.avatar_url} />
                        <AvatarFallback>
                          {member.user_profile?.full_name?.charAt(0) || member.user_profile?.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {member.user_profile?.full_name || member.user_profile?.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.user_profile?.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {roleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManageUsers && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, 'admin')}
                            disabled={member.role === 'admin'}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, 'project_manager')}
                            disabled={member.role === 'project_manager'}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Make Project Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, 'developer')}
                            disabled={member.role === 'developer'}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Make Developer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id, member.user_profile?.full_name || member.user_profile?.email || 'Unknown')}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(invitation.role)}>
                        {roleLabels[invitation.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* This would need to be populated with inviter info */}
                      Admin
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Overview of what each role can do in this workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(roleLabels).map(([role, label]) => {
              const permissions = getRolePermissions(role as WorkspaceRole);
              return (
                <div key={role} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getRoleBadgeVariant(role as WorkspaceRole)}>
                      {label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {roleDescriptions[role as WorkspaceRole]}
                  </p>
                  <div className="space-y-1">
                    {Object.entries(permissions).map(([resource, actions]) => (
                      <div key={resource} className="text-xs">
                        <span className="font-medium capitalize">{resource}:</span>
                        <span className="ml-1 text-muted-foreground">
                          {Object.entries(actions as any)
                            .filter(([, allowed]) => allowed)
                            .map(([action]) => action)
                            .join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
