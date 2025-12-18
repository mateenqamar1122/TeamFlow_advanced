import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Activity,
  Calendar,
  Target
} from 'lucide-react';

// Demo component to showcase the new dashboard features
export function DashboardDemo() {
  const demoStats = {
    totalProjects: 12,
    activeProjects: 8,
    totalTasks: 45,
    completedTasks: 32,
    pendingTasks: 13,
    completionRate: 71.1,
    totalUsers: 5,
    totalActivities: 128
  };

  const demoActivities = [
    {
      id: '1',
      action_type: 'create',
      entity_type: 'task',
      entity_name: 'Implement user authentication',
      user_name: 'John Doe',
      created_at: new Date().toISOString(),
      description: 'Created new task "Implement user authentication"'
    },
    {
      id: '2',
      action_type: 'status_change',
      entity_type: 'project',
      entity_name: 'Website Redesign',
      user_name: 'Jane Smith',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      description: 'Changed project status from planning to active'
    },
    {
      id: '3',
      action_type: 'comment',
      entity_type: 'task',
      entity_name: 'Fix login bug',
      user_name: 'Mike Johnson',
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      description: 'Added comment on task "Fix login bug"'
    }
  ];

  const demoTeamMembers = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      tasksCompleted: 12,
      tasksAssigned: 15,
      completionRate: 80,
      performance: 'excellent' as const
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      tasksCompleted: 8,
      tasksAssigned: 12,
      completionRate: 67,
      performance: 'good' as const
    },
    {
      name: 'Mike Johnson',
      email: 'mike@example.com',
      tasksCompleted: 5,
      tasksAssigned: 10,
      completionRate: 50,
      performance: 'average' as const
    }
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard Features Demo</h1>
        <p className="text-muted-foreground">
          Showcasing the new Dashboard Enhancements and Activity Logs system
        </p>
      </div>

      {/* Stats Overview Demo */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Enhanced Statistics Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Good
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
                <div className="text-3xl font-bold">{demoStats.activeProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {demoStats.totalProjects - demoStats.activeProjects} completed
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-green-50">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Excellent
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Task Completion</h3>
                <div className="text-3xl font-bold">{demoStats.completedTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {demoStats.completionRate.toFixed(1)}% completion rate
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Needs Attention
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Pending Tasks</h3>
                <div className="text-3xl font-bold">{demoStats.pendingTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {demoStats.totalTasks} total tasks
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  High Activity
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Team Activity</h3>
                <div className="text-3xl font-bold">{demoStats.totalActivities}</div>
                <p className="text-xs text-muted-foreground">
                  {demoStats.totalUsers} active users
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Activity Feed Demo */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Activity Feed</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoActivities.map((activity, index) => (
                <div key={activity.id} className="relative">
                  {index < demoActivities.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-background flex items-center justify-center text-blue-600">
                      <Activity className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{activity.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-2">
                        {activity.description}
                        {activity.entity_name && (
                          <span className="font-medium">
                            {' '}&quot;{activity.entity_name}&quot;
                          </span>
                        )}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {activity.action_type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Team Performance Demo */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Team Performance</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demoTeamMembers.map((member) => (
                <div key={member.email} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge
                      className={
                        member.performance === 'excellent' ? 'bg-green-100 text-green-800' :
                        member.performance === 'good' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {member.performance === 'excellent' ? 'Excellent' :
                       member.performance === 'good' ? 'Good' : 'Average'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.tasksCompleted}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.tasksAssigned}</div>
                      <div className="text-xs text-muted-foreground">Assigned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{member.completionRate}%</div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                    </div>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${member.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Feature Highlights */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Key Features Implemented</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Enhancements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Enhanced statistics with trends and progress bars
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Tabbed interface for better organization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Real-time data updates and synchronization
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Team performance analytics and insights
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Logs System</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Comprehensive activity tracking and logging
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Advanced filtering and search capabilities
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Automated database triggers for activity capture
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Real-time activity feed with live updates
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default DashboardDemo;
