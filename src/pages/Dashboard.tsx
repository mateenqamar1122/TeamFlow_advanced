import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderKanban, CheckSquare, Plus, AlertCircle, Loader2, Activity, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { StatsOverview } from "@/components/StatsOverview";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TeamPerformance } from "@/components/TeamPerformance";
import { QuickActions } from "@/components/QuickActions";
import { WorkspaceMembers } from "@/components/WorkspaceMembers";
import { OKROverviewWidget } from "@/components/OKROverviewWidget";

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks();



  // Get recent projects (latest 3)
  const recentProjects = useMemo(() => {
    return projects.slice(0, 3).map(project => ({
      ...project,
      dueDate: new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      members: project.members.length,
    }));
  }, [projects]);

  // Get upcoming tasks (first 3 non-completed tasks)
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(task => task.status !== 'done')
      .slice(0, 3)
      .map(task => ({
        ...task,
        project: "TeamFlow", // Since we don't have project association in tasks yet
        dueDate: new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
  }, [tasks]);

  // Loading state
  if (projectsLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (projectsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Error loading dashboard data</p>
          <p className="text-muted-foreground text-sm mt-2">
            {projectsError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/projects")} className="rounded-2xl">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <StatsOverview showTeamStats={true} showTrends={true} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="quick-actions" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Projects */}
            <Card className="rounded-2xl border-border/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Recent Projects</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentProjects.length > 0 ? (
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="p-4 rounded-xl border border-border/40 hover:border-primary/40 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">Due {project.dueDate}</p>
                            {project.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            project.status === 'completed' ? 'bg-green-100 text-green-800' :
                            project.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{project.progress}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="ml-6 text-sm text-muted-foreground">
                            {project.members} {project.members === 1 ? 'member' : 'members'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects yet</p>
                    <Button
                      className="mt-4"
                      onClick={() => navigate("/projects")}
                    >
                      Create Your First Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="rounded-2xl border-border/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Upcoming Tasks</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-primary/40 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            task.status === 'todo' ? 'bg-gray-400' :
                            task.status === 'in-progress' ? 'bg-blue-500' :
                            'bg-green-500'
                          }`} />
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground">{task.project}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            task.priority === "High" ? "bg-red-100 text-red-800" :
                            task.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-sm text-muted-foreground min-w-[80px] text-right">
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks yet</p>
                    <Button
                      className="mt-4"
                      onClick={() => navigate("/tasks")}
                    >
                      Create Your First Task
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Goals & OKRs Overview */}
            <OKROverviewWidget />
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed limit={20} showFilters={true} height="600px" />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Team Performance Card */}
            <TeamPerformance />

            {/* Workspace Members Card */}
            <WorkspaceMembers />
          </div>
        </TabsContent>

        <TabsContent value="quick-actions">
          <QuickActions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
