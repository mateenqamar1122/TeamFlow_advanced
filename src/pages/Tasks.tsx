import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MoreVertical, GitBranch, RefreshCw, Settings, AlertTriangle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTasks, TaskStatus } from "@/hooks/useTasks";
import TaskDependencyManager from "@/components/TaskDependencyManager";
import RecurringTaskManager from "@/components/RecurringTaskManager";
import TaskDialog from "@/components/TaskDialog";
import TaskAttachmentPreview from "@/components/TaskAttachmentPreview";

export default function Tasks() {
  const { addNotification } = useNotifications();
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleOpenDialog = (taskId?: string, status?: TaskStatus) => {
    setEditingTask(taskId || null);
    setDefaultStatus(status || 'todo');
    setIsDialogOpen(true);
  };

  const handleTaskDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
  };



  const handleDeleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    await deleteTask(id);
    if (task) {
      addNotification({
        type: "task",
        title: "Task Deleted",
        message: `"${task.title}" has been deleted`,
      });
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: TaskStatus) => {
    if (draggedTask) {
      const task = tasks.find((t) => t.id === draggedTask);
      await updateTask(draggedTask, { status });
      const statusText = status === "in-progress" ? "In Progress" : status === "done" ? "Done" : "To Do";
      if (task) {
        addNotification({
          type: "task",
          title: "Task Status Changed",
          message: `"${task.title}" moved to ${statusText}`,
        });
      }
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-accent/10 text-accent border-accent/20";
      case "Medium":
        return "bg-highlight/10 text-highlight border-highlight/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks with kanban board, dependencies, and recurring patterns</p>
        </div>
        {activeTab === 'kanban' && (
          <Button className="rounded-2xl" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="dependencies" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Dependencies
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Recurring Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-6">
          {/* Task Statistics */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {tasks.filter(t => t.is_blocked).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Blocked Tasks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {tasks.filter(t => t.is_recurring).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Recurring Tasks</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {tasks.filter(t => t.status === 'done').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No tasks yet. Create your first task to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className="space-y-4"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  {column.title}
                  <Badge variant="secondary" className="rounded-full">
                    {columnTasks.length}
                  </Badge>
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => handleOpenDialog(undefined, column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className="rounded-2xl border-border/40 hover-lift cursor-move group"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium group-hover:text-primary transition-colors">
                                {task.title}
                              </h3>
                              {task.is_blocked && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                              {task.is_recurring && (
                                <RefreshCw className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            {task.is_blocked && task.blocked_reason && (
                              <p className="text-xs text-orange-600 mt-1">{task.blocked_reason}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${getPriorityColor(task.priority)} rounded-full text-xs border`}
                            >
                              {task.priority}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(task.id)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTaskId(task.id);
                                    setActiveTab('dependencies');
                                  }}
                                >
                                  <GitBranch className="w-4 h-4 mr-2" />
                                  Dependencies
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="rounded-full text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <div className="flex items-center gap-2">
                            {task.assignee_name && (
                              <>
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={task.assignee_avatar} />
                                  <AvatarFallback>{task.assignee_name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">
                                  {task.assignee_name}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Attachment Preview */}
                          <TaskAttachmentPreview
                            taskId={task.id}
                            showCount={true}
                            className="flex items-center"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
            })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-6">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Tasks Available</h3>
                <p className="text-muted-foreground mb-4">
                  Create some tasks first to manage dependencies between them.
                </p>
                <Button onClick={() => setActiveTab('kanban')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Tasks
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Task Selection */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Select Task</h3>
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTaskId === task.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-muted-foreground">{task.status}</div>
                          </div>
                          {task.is_blocked && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dependency Management */}
              <div className="lg:col-span-2">
                {selectedTaskId ? (
                  <TaskDependencyManager taskId={selectedTaskId} />
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Task Dependencies</h3>
                      <p className="text-muted-foreground">
                        Select a task from the left to view and manage its dependencies.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Overview of all dependencies */}
          <TaskDependencyManager showAllDependencies={true} />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringTaskManager />
        </TabsContent>
      </Tabs>

      {/* Task Dialog with Attachments Support */}
      <TaskDialog
        open={isDialogOpen}
        onOpenChange={handleTaskDialogClose}
        task={editingTask ? tasks.find(t => t.id === editingTask) : null}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
