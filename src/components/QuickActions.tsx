import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  CheckSquare,
  FolderKanban,
  MessageCircle,
  Users,
  Zap,
  Clock,
  Timer,
  Bell,
  Star,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { toast } from '@/hooks/use-toast';

interface QuickTaskForm {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  project_id?: string;
}

interface QuickProjectForm {
  name: string;
  description: string;
  due_date: string;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { logActivity } = useActivityLogs();

  const [taskForm, setTaskForm] = useState<QuickTaskForm>({
    title: '',
    description: '',
    priority: 'Medium'
  });

  const [projectForm, setProjectForm] = useState<QuickProjectForm>({
    name: '',
    description: '',
    due_date: ''
  });

  const [taskLoading, setTaskLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const createQuickTask = async () => {
    if (!user || !taskForm.title.trim()) return;

    setTaskLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          priority: taskForm.priority,
          status: 'todo',
          assignee_id: user.id,
          created_by: user.id,
          project_id: taskForm.project_id || null
        }).select();

      if (error) throw error;

      if (data && data[0]) {
        await logActivity(
          'create',
          'task',
          data[0].id,
          taskForm.title.trim(),
          undefined,
          { priority: taskForm.priority, quick_create: true },
          `Quick created task "${taskForm.title.trim()}"`
        );
      }


      toast({
        title: "Task created",
        description: `"${taskForm.title}" has been added to your tasks.`,
      });

      // Reset form
      setTaskForm({
        title: '',
        description: '',
        priority: 'Medium',
        project_id: undefined
      });
      setTaskDialogOpen(false);

    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTaskLoading(false);
    }
  };

  const createQuickProject = async () => {
    if (!user || !projectForm.name.trim()) return;

    setProjectLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectForm.name.trim(),
          description: projectForm.description.trim() || null,
          due_date: projectForm.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planning',
          progress: 0,
          members: JSON.stringify([{ id: user.id, name: user.email, role: 'owner' }]),
          created_by: user.id
        }).select();

      if (error) throw error;

      if (data && data[0]) {
        await logActivity(
          'create',
          'project',
          data[0].id,
          projectForm.name.trim(),
          undefined,
          { quick_create: true },
          `Quick created project "${projectForm.name.trim()}"`
        );
      }

      toast({
        title: "Project created",
        description: `"${projectForm.name}" has been created successfully.`,
      });

      // Reset form
      setProjectForm({
        name: '',
        description: '',
        due_date: ''
      });
      setProjectDialogOpen(false);

    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProjectLoading(false);
    }
  };

  const quickActions = [
    {
      id: 'new-task',
      title: 'Create Task',
      description: 'Add a new task quickly',
      icon: CheckSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: () => setTaskDialogOpen(true)
    },
    {
      id: 'new-project',
      title: 'Create Project',
      description: 'Start a new project',
      icon: FolderKanban,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: () => setProjectDialogOpen(true)
    },
    {
      id: 'view-tasks',
      title: 'My Tasks',
      description: 'View all your tasks',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      action: () => navigate('/tasks')
    },
    {
      id: 'view-projects',
      title: 'All Projects',
      description: 'Browse all projects',
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      action: () => navigate('/projects')
    },
    {
      id: 'time-tracking',
      title: 'Time Tracking',
      description: 'Track your work time',
      icon: Timer,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      action: () => navigate('/time-tracking')
    },
    {
      id: 'reminders',
      title: 'Reminders',
      description: 'Team reminders & alerts',
      icon: Bell,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      action: () => navigate('/reminders')
    },
    {
      id: 'team',
      title: 'Team',
      description: 'Manage team members',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      action: () => navigate('/team')
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      description: 'Share your thoughts',
      icon: MessageCircle,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      action: () => navigate('/contact')
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-accent"
              onClick={action.action}
            >
              <div className={`p-2 rounded-lg ${action.bgColor}`}>
                <action.icon className={`h-6 w-6 ${action.color}`} />
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Quick Task Dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Create Quick Task
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Task title..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <Textarea
                  placeholder="Task description (optional)..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low Priority</SelectItem>
                      <SelectItem value="Medium">Medium Priority</SelectItem>
                      <SelectItem value="High">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={taskForm.project_id || ''}
                    onValueChange={(value) => setTaskForm(prev => ({ ...prev, project_id: value || undefined }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setTaskDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={createQuickTask}
                  disabled={!taskForm.title.trim() || taskLoading}
                  className="flex-1"
                >
                  {taskLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Project Dialog */}
        <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Create Quick Project
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Project name..."
                  value={projectForm.name}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Textarea
                  placeholder="Project description (optional)..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Input
                  type="date"
                  value={projectForm.due_date}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, due_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setProjectDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={createQuickProject}
                  disabled={!projectForm.name.trim() || projectLoading}
                  className="flex-1"
                >
                  {projectLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default QuickActions;
