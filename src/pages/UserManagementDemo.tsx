import React, { useState } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { UserManagementDashboard } from '@/components/UserManagementDashboard';
import { TaskManagementBoard } from '@/components/TaskManagementBoard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CheckSquare, Settings, Building, UserPlus } from 'lucide-react';

export default function UserManagementDemo() {
  const { userProfile, onboardingSteps } = useUserManagement();
  const { workspaces, currentWorkspace } = useWorkspaces();

  const [activeTab, setActiveTab] = useState('overview');

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const totalSteps = onboardingSteps.length;
  const onboardingProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Use the first workspace if no current workspace is selected
  const selectedWorkspaceId = currentWorkspace?.id || workspaces[0]?.id;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'project_manager':
        return 'default';
      case 'developer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!selectedWorkspaceId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Workspace Available</CardTitle>
            <CardDescription>
              You need to create or join a workspace to access user management features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Building className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management System</h1>
          <p className="text-muted-foreground">
            Complete user management with role-based access control
          </p>
        </div>
        <div className="flex items-center gap-4">
          {userProfile && (
            <div className="text-right">
              <p className="font-medium">{userProfile.full_name || userProfile.email}</p>
              <Badge variant="secondary" className="text-xs">
                Profile Setup: {onboardingProgress.toFixed(0)}%
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Current Workspace Info */}
      {currentWorkspace && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-blue-900">{currentWorkspace.name}</CardTitle>
                <CardDescription className="text-blue-700">
                  {currentWorkspace.description || 'No description provided'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Task Board
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Demo
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userProfile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="font-medium">{userProfile.full_name || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm">{userProfile.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Title:</span>
                      <span className="text-sm">{userProfile.title || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Onboarding:</span>
                      <Badge variant={onboardingProgress === 100 ? 'default' : 'secondary'}>
                        {onboardingProgress.toFixed(0)}% Complete
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading profile...</p>
                )}
              </CardContent>
            </Card>

            {/* Workspace Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Workspace Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Workspaces:</span>
                    <Badge variant="secondary">{workspaces.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current:</span>
                    <span className="text-sm font-medium">
                      {currentWorkspace?.name || 'None selected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Features:</span>
                    <div className="flex gap-1">
                      {currentWorkspace?.settings.features.time_tracking && (
                        <Badge variant="outline" className="text-xs">Time</Badge>
                      )}
                      {currentWorkspace?.settings.features.calendar && (
                        <Badge variant="outline" className="text-xs">Calendar</Badge>
                      )}
                      {currentWorkspace?.settings.features.gantt && (
                        <Badge variant="outline" className="text-xs">Gantt</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Onboarding Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {onboardingSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm capitalize">
                        {step.step_name.replace('_', ' ')}
                      </span>
                      {step.completed && (
                        <Badge variant="outline" className="text-xs">Done</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role Permissions Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control (RBAC) Demo</CardTitle>
              <CardDescription>
                This system supports three main user roles with different permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Admin Role */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="destructive">Admin</Badge>
                  </div>
                  <h4 className="font-medium mb-2">Full Access</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Workspace management</li>
                    <li>• User management</li>
                    <li>• All project operations</li>
                    <li>• Task management</li>
                    <li>• Calendar & timeline access</li>
                  </ul>
                </div>

                {/* Project Manager Role */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="default">Project Manager</Badge>
                  </div>
                  <h4 className="font-medium mb-2">Project Leadership</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Create & manage projects</li>
                    <li>• Assign & manage tasks</li>
                    <li>• Invite team members</li>
                    <li>• Calendar management</li>
                    <li>• Timeline viewing</li>
                  </ul>
                </div>

                {/* Developer Role */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">Developer</Badge>
                  </div>
                  <h4 className="font-medium mb-2">Task Execution</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• View assigned projects</li>
                    <li>• Manage assigned tasks</li>
                    <li>• Create personal tasks</li>
                    <li>• Calendar access</li>
                    <li>• Timeline viewing</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Management Tab */}
        <TabsContent value="users">
          <UserManagementDashboard workspaceId={selectedWorkspaceId} />
        </TabsContent>

        {/* Task Management Tab */}
        <TabsContent value="tasks">
          <TaskManagementBoard workspaceId={selectedWorkspaceId} />
        </TabsContent>

        {/* Invite Demo Tab */}
        <TabsContent value="invite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitation System Demo</CardTitle>
              <CardDescription>
                Test the magic link invitation system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Admin/Project Manager sends invitation with role assignment</li>
                    <li>2. Invited user receives email with magic link</li>
                    <li>3. User clicks link and is authenticated automatically</li>
                    <li>4. User is added to workspace with assigned role</li>
                    <li>5. User can start working on assigned tasks immediately</li>
                  </ol>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Invitation Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Magic link authentication</li>
                      <li>• Role-based invitations</li>
                      <li>• Personal welcome messages</li>
                      <li>• Expiration handling</li>
                      <li>• Automatic onboarding</li>
                    </ul>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Security Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Secure token generation</li>
                      <li>• Email verification</li>
                      <li>• Time-limited access</li>
                      <li>• Single-use tokens</li>
                      <li>• Role validation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
