import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Target,
  Award,
  Clock,
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useTasks } from '@/hooks/useTasks';
import { useActivityLogs } from '@/hooks/useActivityLogs';

interface TeamMemberWithStats {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role: string;
  tasksCompleted: number;
  tasksAssigned: number;
  completionRate: number;
  lastActive?: string;
  isOnline: boolean;
  performance: 'excellent' | 'good' | 'average' | 'needs-improvement';
  recentActivity: number;
}

export function TeamPerformance() {
  const { currentWorkspace } = useWorkspaceContext();
  const { members, loading: membersLoading, error: membersError } = useWorkspaceMembers(currentWorkspace?.id);
  const { tasks } = useTasks();
  const { activities } = useActivityLogs({ limit: 100 });

  if (membersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Activity
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
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-6 w-6 mr-2" />
            Failed to load team data
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate team member performance metrics using real workspace members
  const getTeamPerformanceWithStats = (): TeamMemberWithStats[] => {
    return members.map(member => {
      // Get tasks assigned to this member
      const memberTasks = tasks.filter(task => task.assignee_id === member.user_id);
      const completedTasks = memberTasks.filter(task => task.status === 'done');

      // Get recent activities for this member
      const memberActivities = activities.filter(activity => activity.user_id === member.user_id);
      const recentActivities = memberActivities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return activityDate >= dayAgo;
      });

      // Determine if user is online (activity within last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const isOnline = memberActivities.some(activity =>
        new Date(activity.created_at) >= thirtyMinutesAgo
      );

      // Get last activity time
      const lastActivity = memberActivities.length > 0 ? memberActivities[0].created_at : undefined;

      // Calculate completion rate
      const completionRate = memberTasks.length > 0
        ? (completedTasks.length / memberTasks.length) * 100
        : 0;

      // Determine performance level
      let performance: TeamMemberWithStats['performance'];
      if (completionRate >= 90) {
        performance = 'excellent';
      } else if (completionRate >= 75) {
        performance = 'good';
      } else if (completionRate >= 60) {
        performance = 'average';
      } else {
        performance = 'needs-improvement';
      }

      return {
        id: member.user_id,
        name: member.user_profile?.display_name || 'Unknown User',
        avatar: member.user_profile?.avatar_url,
        email: undefined, // Email is not available in the current profile structure
        role: member.role,
        tasksCompleted: completedTasks.length,
        tasksAssigned: memberTasks.length,
        completionRate,
        lastActive: lastActivity,
        isOnline,
        performance,
        recentActivity: recentActivities.length
      };
    }).sort((a, b) => {
      // Sort by online status first, then by completion rate
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return b.completionRate - a.completionRate;
    });
  };

  const teamMembers = getTeamPerformanceWithStats();

  const getPerformanceBadge = (performance: TeamMemberWithStats['performance']) => {
    const config = {
      excellent: { color: 'bg-green-100 text-green-800', label: 'Excellent' },
      good: { color: 'bg-blue-100 text-blue-800', label: 'Good' },
      average: { color: 'bg-yellow-100 text-yellow-800', label: 'Average' },
      'needs-improvement': { color: 'bg-red-100 text-red-800', label: 'Needs Improvement' }
    };

    return config[performance];
  };

  const getPerformanceIcon = (performance: TeamMemberWithStats['performance']) => {
    switch (performance) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'average':
        return <Target className="h-4 w-4 text-yellow-600" />;
      case 'needs-improvement':
        return <Clock className="h-4 w-4 text-red-600" />;
    }
  };

  // Team overview stats
  const totalTasks = teamMembers.reduce((sum, member) => sum + member.tasksAssigned, 0);
  const totalCompleted = teamMembers.reduce((sum, member) => sum + member.tasksCompleted, 0);
  const overallCompletion = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;
  const activeMembers = teamMembers.filter(member => member.isOnline).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Activity
        </CardTitle>

        {/* Team Overview */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{activeMembers}</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <div className="text-sm text-muted-foreground">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{overallCompletion.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => {
              const badgeConfig = getPerformanceBadge(member.performance);

              return (
                <div key={member.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium">{member.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {member.isOnline ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Activity className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {member.lastActive ? (
                            `Last seen ${new Date(member.lastActive).toLocaleDateString()}`
                          ) : (
                            'Offline'
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.tasksCompleted}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.tasksAssigned}</div>
                      <div className="text-xs text-muted-foreground">Assigned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.recentActivity}</div>
                      <div className="text-xs text-muted-foreground">Recent Activity</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.completionRate.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Completion Rate</div>
                    </div>
                  </div>

                  {/* Performance Badge and Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPerformanceIcon(member.performance)}
                      <Badge className={badgeConfig.color}>
                        {badgeConfig.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.tasksAssigned > 0 ? `${member.tasksCompleted}/${member.tasksAssigned} tasks` : 'No tasks assigned'}
                    </div>
                  </div>

                  {member.tasksAssigned > 0 && (
                    <div className="mt-3">
                      <Progress
                        value={member.completionRate}
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
