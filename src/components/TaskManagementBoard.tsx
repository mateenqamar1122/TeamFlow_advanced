import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useUserManagement, WorkspaceMember } from '@/hooks/useUserManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Calendar,
  MoreVertical,
  Clock,
  Flag,
  Play,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface TaskBoardProps {
  workspaceId: string;
  projectId?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  assigned_to?: string;
  project_id?: string;
}

// Define the 3 task stages (matching TaskStatus enum)
const TASK_STAGES = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'bg-gray-100',
    icon: <Clock className="h-4 w-4" />,
    description: 'Tasks ready to be started'
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'bg-blue-100',
    icon: <Play className="h-4 w-4" />,
    description: 'Tasks currently being worked on'
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-green-100',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Completed tasks'
  }
];

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const priorityIcons = {
  low: <Flag className="h-3 w-3" />,
  medium: <Flag className="h-3 w-3" />,
  high: <Flag className="h-3 w-3" />,
  urgent: <Flag className="h-3 w-3" />
};

export function TaskManagementBoard({ workspaceId, projectId }: TaskBoardProps) {
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask
  } = useTasks();

  const {
    getWorkspaceMembers,
    getCurrentMembership
  } = useUserManagement();

  const [members, setMembers] = useState<{ user_id: string; user_profile?: { full_name?: string; email?: string } }[]>([]);
  const [currentMember, setCurrentMember] = useState<WorkspaceMember | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tasksByStage, setTasksByStage] = useState<Record<string, Array<{ id: string; title: string; description?: string; priority: string; status: string; due_date?: string; assigned_to?: string }>>>({
    todo: [],
    'in-progress': [],
    done: []
  });

  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'Medium',
    due_date: '',
    assigned_to: 'unassigned',
    project_id: projectId
  });

  useEffect(() => {
    const loadDataAsync = async () => {
      try {
        const [membersData, membershipData] = await Promise.all([
          getWorkspaceMembers(workspaceId),
          getCurrentMembership(workspaceId)
        ]);

        setMembers(membersData);
        setCurrentMember(membershipData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      }
    };

    loadDataAsync();
  }, [workspaceId, projectId, getWorkspaceMembers, getCurrentMembership]);

  useEffect(() => {
    // Group tasks by status/stage
    if (tasks) {
      const grouped = TASK_STAGES.reduce((acc, stage) => {
        acc[stage.id] = tasks.filter(task => task.status === stage.id);
        return acc;
      }, {} as Record<string, Array<{ id: string; title: string; description?: string; priority: string; status: string; due_date?: string; assigned_to?: string }>>);
      setTasksByStage(grouped);
    }
  }, [tasks]);

  const loadData = async () => {
    try {
      const [membersData, membershipData] = await Promise.all([
        getWorkspaceMembers(workspaceId),
        getCurrentMembership(workspaceId)
      ]);

      setMembers(membersData);
      setCurrentMember(membershipData);

      // Tasks are automatically loaded by the useTasks hook
      // No need to call fetchTasks manually here
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!taskForm.title.trim()) {
        toast({
          title: "Missing Information",
          description: "Task title is required",
          variant: "destructive"
        });
        return;
      }

      const taskData = {
        ...taskForm,
        workspace_id: workspaceId,
        status: 'todo' as const,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
        assigned_to: taskForm.assigned_to === 'unassigned' ? null : taskForm.assigned_to,
        tags: []
      };

      await createTask(taskData);

      setTaskForm({
        title: '',
        description: '',
        priority: 'Medium',
        due_date: '',
        assigned_to: 'unassigned',
        project_id: projectId
      });

      setCreateDialogOpen(false);
      toast({
        title: "Task Created",
        description: "Task has been created successfully"
      });

      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = async (result: { destination?: { droppableId: string; index: number }; source: { droppableId: string; index: number }; draggableId: string }) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task being moved
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    // Update task status
    const newStatus = destination.droppableId as 'todo' | 'in-progress' | 'done';

    try {
      await updateTask(task.id, { status: newStatus });
      await loadData(); // Refresh data

      toast({
        title: "Task Updated",
        description: `Task moved to ${TASK_STAGES.find(s => s.id === newStatus)?.title}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const handleTaskAction = async (taskId: string, action: string) => {
    try {
      switch (action) {
        case 'start':
          await updateTask(taskId, { status: 'in-progress' as const });
          break;
        case 'complete':
          await updateTask(taskId, { status: 'done' as const });
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this task?')) {
            await deleteTask(taskId);
          }
          return;
        default:
          return;
      }

      await loadData();
      toast({
        title: "Task Updated",
        description: "Task status has been updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const canCreateTasks = currentMember ? (currentMember.role === 'admin' || currentMember.role === 'project_manager') : false;
  const canUpdateTasks = currentMember ? (currentMember.role === 'admin' || currentMember.role === 'project_manager') : false;

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
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-muted-foreground">
            Track and manage tasks across 3 stages of completion
          </p>
        </div>
        {canCreateTasks && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to the workspace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={taskForm.priority} onValueChange={(value: 'Low' | 'Medium' | 'High') =>
                      setTaskForm({ ...taskForm, priority: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select value={taskForm.assigned_to} onValueChange={(value) =>
                    setTaskForm({ ...taskForm, assigned_to: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.user_profile?.full_name || member.user_profile?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateTask} disabled={!taskForm.title}>
                    Create Task
                  </Button>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Task Board with 4 Stages */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TASK_STAGES.map((stage) => (
            <Card key={stage.id} className={`${stage.color} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {stage.icon}
                    <CardTitle className="text-sm font-medium">
                      {stage.title}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {tasksByStage[stage.id]?.length || 0}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {stage.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[200px] p-2 rounded ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {tasksByStage[stage.id]?.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-3 rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-900 leading-tight">
                                  {task.title}
                                </h4>
                                {canUpdateTasks && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {stage.id === 'todo' && (
                                        <DropdownMenuItem onClick={() => handleTaskAction(task.id, 'start')}>
                                          <Play className="h-3 w-3 mr-2" />
                                          Start Task
                                        </DropdownMenuItem>
                                      )}
                                      {stage.id === 'in-progress' && (
                                        <DropdownMenuItem onClick={() => handleTaskAction(task.id, 'complete')}>
                                          <CheckCircle className="h-3 w-3 mr-2" />
                                          Mark Complete
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => handleTaskAction(task.id, 'delete')}
                                        className="text-red-600"
                                      >
                                        Delete Task
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>

                              {task.description && (
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors]}`}
                                >
                                  {priorityIcons[task.priority as keyof typeof priorityIcons]}
                                  <span className="ml-1 capitalize">{task.priority}</span>
                                </Badge>

                                {task.assigned_to && (
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-xs">
                                      {members.find(m => m.user_id === task.assigned_to)?.user_profile?.full_name?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>

                              {task.due_date && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
