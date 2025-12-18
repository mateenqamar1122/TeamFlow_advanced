import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Mail,
  Shield,
  Crown,
  UserPlus,
  Settings,
  MoreVertical,
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function WorkspaceMembers() {
  const { currentWorkspace } = useWorkspaceContext();
  const { members, loading: membersLoading, error: membersError } = useWorkspaceMembers(currentWorkspace?.id);
  const { activities } = useActivityLogs({ limit: 100 });

  // Calculate online status for each member (must be before early returns due to hooks rules)
  const membersWithStatus = React.useMemo(() => {
    if (!members || !activities) return [];

    return members.map(member => {
      // Check for recent activity (last 30 minutes for online status)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const memberActivities = activities.filter(activity =>
        activity.user_id === member.user_id &&
        new Date(activity.created_at) >= thirtyMinutesAgo
      );

      // Determine if online - for workspace owner, be more lenient
      const isWorkspaceOwner = member.user_id === currentWorkspace?.owner_id;
      let isOnline;

      if (isWorkspaceOwner) {
        // Owner is online if they have any activity in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const ownerActivities = activities.filter(activity =>
          activity.user_id === member.user_id &&
          new Date(activity.created_at) >= oneHourAgo
        );
        isOnline = ownerActivities.length > 0;
      } else {
        // Other members need recent meaningful activity
        isOnline = memberActivities.some(activity =>
          ['create', 'update', 'comment', 'status_change'].includes(activity.action_type)
        );
      }

      // Get last activity time
      const allMemberActivities = activities.filter(a => a.user_id === member.user_id);
      const lastActivity = allMemberActivities.length > 0 ? allMemberActivities[0].created_at : null;

      return {
        ...member,
        isOnline,
        lastActivity
      };
    }).sort((a, b) => {
      // Sort by: owner first, then online status, then by name
      if (a.user_id === currentWorkspace?.owner_id) return -1;
      if (b.user_id === currentWorkspace?.owner_id) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (a.user_profile?.display_name || '').localeCompare(b.user_profile?.display_name || '');
    });
  }, [members, activities, currentWorkspace]);

  if (membersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (membersError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-6 w-6 mr-2" />
            Failed to load team members
          </div>
        </CardContent>
      </Card>
    );
  }



  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'manager':
        return <Settings className="h-4 w-4 text-blue-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastSeen = (lastActivity: string | null) => {
    if (!lastActivity) return 'Never';

    const lastSeen = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSeen.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({membersWithStatus.length})
          </CardTitle>
          <Button variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {membersWithStatus.filter(m => m.isOnline).length}
            </div>
            <div className="text-xs text-muted-foreground">Online Now</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {membersWithStatus.filter(m => m.role === 'admin' || m.role === 'owner').length}
            </div>
            <div className="text-xs text-muted-foreground">Admins</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {membersWithStatus.filter(m => m.role === 'member').length}
            </div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {membersWithStatus.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {membersWithStatus.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user_profile?.avatar_url} />
                      <AvatarFallback>
                        {(member.user_profile?.display_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">
                        {member.user_profile?.display_name || 'Unknown User'}
                      </h4>
                      {getRoleIcon(member.role)}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>

                      {member.isOnline ? (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          <Activity className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Last seen {formatLastSeen(member.lastActivity)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Users className="h-4 w-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    {member.role !== 'owner' && (
                      <DropdownMenuItem className="text-red-600">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Manage Role
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkspaceMembers;

