import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useWorkspaceMembers, type WorkspaceRole } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceIntegrations } from '@/hooks/useWorkspaceIntegrations';
import { Settings, Users, UserPlus, Trash2, Mail, Crown, Save, Loader2, Github, Slack, Video, Trello, Key, Globe, Copy, Eye, EyeOff, Building, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InviteFormData {
  email: string;
  role: WorkspaceRole;
}

interface WorkspaceFormData {
  name: string;
  slug: string;
  description: string;
  timezone: string;
  currency: string;
  features: {
    time_tracking: boolean;
    calendar: boolean;
    gantt: boolean;
    reports: boolean;
  };
}

export default function WorkspaceSettings() {
  const navigate = useNavigate();
  const { currentWorkspace, currentMembership, hasPermission, fetchWorkspaces } = useWorkspaceContext();
  const {
    members,
    invitations,
    loading: membersLoading,
    inviteUser,
    resendInvitation,
    cancelInvitation,
    updateMemberRole,
    removeMember,
    fetchMembers
  } = useWorkspaceMembers(currentWorkspace?.id);
  const { integrations, apiKeys, webhooks, generateApiKey, createWebhook, deleteApiKey, deleteWebhook } = useWorkspaceIntegrations();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    role: 'member'
  });

  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormData>({
    name: '',
    slug: '',
    description: '',
    timezone: 'UTC',
    currency: 'USD',
    features: {
      time_tracking: true,
      calendar: true,
      gantt: true,
      reports: true,
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] });
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  // Initialize form data when workspace loads
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceForm({
        name: currentWorkspace.name,
        slug: currentWorkspace.slug,
        description: currentWorkspace.description || '',
        timezone: currentWorkspace.settings.timezone,
        currency: currentWorkspace.settings.currency,
        features: currentWorkspace.settings.features,
      });
    }
  }, [currentWorkspace]);

  if (!currentWorkspace || !currentMembership) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No workspace selected</p>
      </div>
    );
  }

  const canManageWorkspace = hasPermission('workspace', 'manage');
  const canInviteUsers = hasPermission('users', 'invite');
  const canManageUsers = hasPermission('users', 'manage');

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'guest': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle form changes
  const handleFormChange = (field: keyof WorkspaceFormData, value: any) => {
    setWorkspaceForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleFeatureChange = (feature: keyof WorkspaceFormData['features'], value: boolean) => {
    setWorkspaceForm(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: value }
    }));
    setHasChanges(true);
  };

  // Save workspace settings
  const saveWorkspaceSettings = async () => {
    if (!currentWorkspace || !canManageWorkspace) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceForm.name,
          slug: workspaceForm.slug,
          description: workspaceForm.description,
          settings: {
            ...currentWorkspace.settings,
            timezone: workspaceForm.timezone,
            currency: workspaceForm.currency,
            features: workspaceForm.features,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      setHasChanges(false);
      await fetchWorkspaces();

      toast({
        title: "Settings Saved",
        description: "Workspace settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving workspace settings:', error);
      toast({
        title: "Error",
        description: "Failed to save workspace settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    const success = await inviteUser(inviteForm);
    if (success) {
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'member' });
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteForm.email}`,
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    const success = await updateMemberRole(memberId, newRole);
    if (success) {
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (confirm(`Are you sure you want to remove ${userName} from this workspace?`)) {
      const success = await removeMember(memberId);
      if (success) {
        toast({
          title: "Member Removed",
          description: `${userName} has been removed from the workspace.`,
        });
      }
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the API key.",
        variant: "destructive",
      });
      return;
    }

    const result = await generateApiKey(newApiKeyName);
    if (result) {
      setGeneratedApiKey(result.key);
      setNewApiKeyName('');
      setShowApiKeyDialog(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter both name and URL for the webhook.",
        variant: "destructive",
      });
      return;
    }

    const result = await createWebhook(newWebhook.name, newWebhook.url, newWebhook.events);
    if (result) {
      setNewWebhook({ name: '', url: '', events: [] });
      setShowWebhookDialog(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace || deleteConfirmationText !== currentWorkspace.name) {
      toast({
        title: "Confirmation Required",
        description: "Please type the workspace name exactly to confirm deletion.",
        variant: "destructive",
      });
      return;
    }

    // Additional safety check for owner role
    if (currentMembership?.role !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only workspace owners can delete workspaces.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeletingWorkspace(true);
      const workspaceName = currentWorkspace.name;

      console.log('Deleting workspace:', currentWorkspace.id);

      // Delete workspace from database (cascade deletion should handle related records)
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', currentWorkspace.id);

      if (error) {
        console.error('Workspace deletion error:', error);
        throw new Error(error.message || 'Failed to delete workspace');
      }

      toast({
        title: "Workspace Deleted",
        description: `"${workspaceName}" has been permanently deleted.`,
      });

      // Clear local state and refresh workspaces
      await fetchWorkspaces();

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (error) {
      console.error('Error deleting workspace:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Deletion Failed",
        description: `Failed to delete workspace: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsDeletingWorkspace(false);
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Settings className="h-10 w-10 text-primary" />
          Workspace Settings
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage workspace settings, team members, and integrations for "{currentWorkspace.name}".
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="members">Members & Roles</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={workspaceForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    disabled={!canManageWorkspace}
                    placeholder="Enter workspace name"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Workspace Slug</Label>
                  <Input
                    id="slug"
                    value={workspaceForm.slug}
                    onChange={(e) => handleFormChange('slug', e.target.value)}
                    disabled={!canManageWorkspace}
                    placeholder="workspace-slug"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in URLs. Only lowercase letters, numbers, and hyphens allowed.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={workspaceForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  disabled={!canManageWorkspace}
                  rows={3}
                  placeholder="Describe your workspace..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={workspaceForm.timezone}
                    onValueChange={(value) => handleFormChange('timezone', value)}
                    disabled={!canManageWorkspace}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={workspaceForm.currency}
                    onValueChange={(value) => handleFormChange('currency', value)}
                    disabled={!canManageWorkspace}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD ($) - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD ($) - Australian Dollar</SelectItem>
                      <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                      <SelectItem value="CNY">CNY (¥) - Chinese Yuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Feature Toggles</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Control which features are available in your workspace.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">Time Tracking</span>
                      <p className="text-sm text-muted-foreground">Track time spent on tasks</p>
                    </div>
                    <Switch
                      checked={workspaceForm.features.time_tracking}
                      onCheckedChange={(checked) => handleFeatureChange('time_tracking', checked)}
                      disabled={!canManageWorkspace}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">Calendar View</span>
                      <p className="text-sm text-muted-foreground">Calendar interface for tasks</p>
                    </div>
                    <Switch
                      checked={workspaceForm.features.calendar}
                      onCheckedChange={(checked) => handleFeatureChange('calendar', checked)}
                      disabled={!canManageWorkspace}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">Gantt Charts</span>
                      <p className="text-sm text-muted-foreground">Timeline and dependency views</p>
                    </div>
                    <Switch
                      checked={workspaceForm.features.gantt}
                      onCheckedChange={(checked) => handleFeatureChange('gantt', checked)}
                      disabled={!canManageWorkspace}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">Reports</span>
                      <p className="text-sm text-muted-foreground">Analytics and reporting</p>
                    </div>
                    <Switch
                      checked={workspaceForm.features.reports}
                      onCheckedChange={(checked) => handleFeatureChange('reports', checked)}
                      disabled={!canManageWorkspace}
                    />
                  </div>
                </div>
              </div>

              {canManageWorkspace && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
                  </div>
                  <Button
                    onClick={saveWorkspaceSettings}
                    disabled={!hasChanges || isLoading}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <div className="space-y-6">
            {/* Team Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Total Members</p>
                      <p className="text-2xl font-bold">{members.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Pending Invites</p>
                      <p className="text-2xl font-bold">{invitations.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Admins</p>
                      <p className="text-2xl font-bold">
                        {members.filter(m => ['owner', 'admin'].includes(m.role)).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Managers</p>
                      <p className="text-2xl font-bold">
                        {members.filter(m => m.role === 'manager').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Members */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Workspace Members ({members.length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage team members and their roles within this workspace
                    </p>
                  </div>
                  {canInviteUsers && (
                    <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Invite New Team Member</DialogTitle>
                          <p className="text-sm text-muted-foreground">
                            Send an invitation email with a magic link to join this workspace
                          </p>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={inviteForm.email}
                              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="colleague@company.com"
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select
                              value={inviteForm.role}
                              onValueChange={(value: WorkspaceRole) => setInviteForm(prev => ({ ...prev, role: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">Member</span>
                                    <span className="text-xs text-muted-foreground">Can create and manage tasks</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="manager">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">Project Manager</span>
                                    <span className="text-xs text-muted-foreground">Can create projects and invite members</span>
                                  </div>
                                </SelectItem>
                                {(currentMembership.role === 'owner' || currentMembership.role === 'admin') && (
                                  <SelectItem value="admin">
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">Admin</span>
                                      <span className="text-xs text-muted-foreground">Full workspace management access</span>
                                    </div>
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Role Description */}
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-900 mb-1">
                              {inviteForm.role.charAt(0).toUpperCase() + inviteForm.role.slice(1)} Permissions:
                            </h4>
                            <ul className="text-xs text-blue-800 space-y-1">
                              {inviteForm.role === 'admin' && (
                                <>
                                  <li>• Full workspace management</li>
                                  <li>• Manage team members and roles</li>
                                  <li>• Create, edit, and delete projects</li>
                                  <li>• Access all reports and analytics</li>
                                </>
                              )}
                              {inviteForm.role === 'manager' && (
                                <>
                                  <li>• Create and manage projects</li>
                                  <li>• Invite new team members</li>
                                  <li>• Manage tasks and timelines</li>
                                  <li>• Access team performance reports</li>
                                </>
                              )}
                              {inviteForm.role === 'member' && (
                                <>
                                  <li>• Create and manage own tasks</li>
                                  <li>• Collaborate on team projects</li>
                                  <li>• Use calendar and timeline views</li>
                                  <li>• Participate in discussions</li>
                                </>
                              )}
                            </ul>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleInviteUser}
                              disabled={!inviteForm.email.trim() || membersLoading}
                              className="flex-1"
                            >
                              {membersLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Invitation
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setShowInviteDialog(false)}
                            >
                              Cancel
                            </Button>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            The invitee will receive an email with a magic link to join this workspace automatically.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading members...</span>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No members yet</h3>
                    <p className="text-gray-500">Start by inviting team members to collaborate.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.user_profile?.avatar_url} />
                            <AvatarFallback>
                              {member.user_profile?.full_name?.charAt(0) ||
                               member.user_profile?.email?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {member.user_profile?.full_name || member.user_profile?.email || 'Unknown User'}
                              </p>
                              {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {member.user_profile?.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(member.role)}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>

                          {canManageUsers && member.role !== 'owner' && member.user_id !== currentMembership.user_id && (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(value: WorkspaceRole) => handleRoleChange(member.id, value)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  {currentMembership.role === 'owner' && (
                                    <SelectItem value="admin">Admin</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id, member.user_profile?.full_name || 'User')}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <p className="text-sm text-muted-foreground">
                    Team members who have been invited but haven't joined yet
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-orange-100">
                            <Mail className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invited as {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)} •
                              Expires {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                            {invitation.inviter_profile && (
                              <p className="text-xs text-muted-foreground">
                                Invited by {invitation.inviter_profile.display_name || 'Team Member'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
                            Pending
                          </Badge>

                          {canInviteUsers && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvitation(invitation.id)}
                                disabled={membersLoading}
                                title="Resend invitation"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelInvitation(invitation.id)}
                                disabled={membersLoading}
                                className="text-destructive hover:text-destructive"
                                title="Cancel invitation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Integrations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Connect your workspace with popular tools and services.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Github className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">GitHub</h3>
                        <p className="text-sm text-muted-foreground">Connect repositories</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Link tasks to GitHub issues and pull requests.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Slack className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">Slack</h3>
                        <p className="text-sm text-muted-foreground">Team notifications</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get task updates and notifications in Slack channels.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Video className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">Zoom</h3>
                        <p className="text-sm text-muted-foreground">Video meetings</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Schedule and join meetings directly from tasks.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Trello className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">Trello</h3>
                        <p className="text-sm text-muted-foreground">Board sync</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sync tasks with Trello boards and cards.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Mail className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="text-sm text-muted-foreground">SMTP notifications</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Send email notifications for task updates.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">Webhooks</h3>
                        <p className="text-sm text-muted-foreground">Custom integrations</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create custom webhooks for external services.
                    </p>
                    <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Webhook</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Webhook Name</Label>
                            <Input
                              value={newWebhook.name}
                              onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="My Webhook"
                            />
                          </div>
                          <div>
                            <Label>Webhook URL</Label>
                            <Input
                              value={newWebhook.url}
                              onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                              placeholder="https://example.com/webhook"
                            />
                          </div>
                          <Button onClick={handleCreateWebhook} className="w-full">
                            Create Webhook
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>API Access</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Generate API keys for custom integrations and third-party applications.
                    </p>
                  </div>
                  <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Key className="h-4 w-4 mr-2" />
                        Generate Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Generate API Key</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>API Key Name</Label>
                          <Input
                            value={newApiKeyName}
                            onChange={(e) => setNewApiKeyName(e.target.value)}
                            placeholder="My Integration"
                          />
                        </div>
                        <Button onClick={handleGenerateApiKey} className="w-full">
                          Generate API Key
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedApiKey && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">New API Key Generated</h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        Make sure to copy your API key now. You won't be able to see it again!
                      </p>
                      <div className="flex items-center gap-2">
                        <Input value={generatedApiKey} readOnly className="font-mono" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedApiKey)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => setGeneratedApiKey(null)}
                      >
                        I've saved my key
                      </Button>
                    </div>
                  )}

                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{apiKey.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {apiKey.key_preview} • Created {new Date(apiKey.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteApiKey(apiKey.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {webhooks.map((webhook) => (
                    <div key={webhook.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{webhook.name}</h4>
                        <p className="text-sm text-muted-foreground">{webhook.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="webhook-notifications">Webhook Notifications</Label>
                      <p className="text-sm text-muted-foreground">Enable webhook notifications for workspace events</p>
                    </div>
                    <Switch id="webhook-notifications" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="api-rate-limiting">API Rate Limiting</Label>
                      <p className="text-sm text-muted-foreground">Enable rate limiting for API requests</p>
                    </div>
                    <Switch id="api-rate-limiting" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="integration-logs">Integration Logs</Label>
                      <p className="text-sm text-muted-foreground">Keep logs of integration activities</p>
                    </div>
                    <Switch id="integration-logs" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Danger Zone - Delete Workspace */}
      {canManageWorkspace && currentMembership?.role === 'owner' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Permanently delete this workspace and all associated data. This action cannot be undone.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">What gets deleted:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All projects and tasks</li>
                <li>• Team member access and data</li>
                <li>• Time tracking records</li>
                <li>• Comments and attachments</li>
                <li>• Integration configurations</li>
                <li>• API keys and webhooks</li>
              </ul>
            </div>

            {showDeleteConfirmation ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="delete-confirmation" className="text-red-600 font-medium">
                    Type "{currentWorkspace.name}" to confirm deletion:
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder={currentWorkspace.name}
                    className="mt-2 border-red-200 focus:border-red-400"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteWorkspace}
                    disabled={isDeletingWorkspace || deleteConfirmationText !== currentWorkspace.name}
                    className="min-w-[140px]"
                  >
                    {isDeletingWorkspace ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Workspace
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirmation(false);
                      setDeleteConfirmationText('');
                    }}
                    disabled={isDeletingWorkspace}
                  >
                    Cancel
                  </Button>
                </div>

                <p className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  ⚠️ <strong>Warning:</strong> This action is permanent and cannot be undone. All data will be lost forever.
                </p>
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirmation(true)}
                className="w-fit"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workspace
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
