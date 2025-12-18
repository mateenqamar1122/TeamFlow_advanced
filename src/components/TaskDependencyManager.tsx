import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Trash2,
  GitBranch,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Link2,
  Unlink
} from 'lucide-react';
import { useTasks, Task, TaskDependency } from '@/hooks/useTasks';

interface TaskDependencyManagerProps {
  taskId?: string;
  showAllDependencies?: boolean;
}

export const TaskDependencyManager: React.FC<TaskDependencyManagerProps> = ({
  taskId,
  showAllDependencies = false
}) => {
  const {
    tasks,
    dependencies,
    createTaskDependency,
    deleteTaskDependency,
    getTaskDependencies,
    getTaskDependents,
    canStartTask
  } = useTasks();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDependency, setNewDependency] = useState({
    taskId: taskId || '',
    dependsOnTaskId: '',
    dependencyType: 'finish_to_start' as TaskDependency['dependency_type'],
    lagDays: 0
  });

  const currentTask = taskId ? tasks.find(t => t.id === taskId) : null;
  const taskDependencies = taskId ? getTaskDependencies(taskId) : [];
  const taskDependents = taskId ? getTaskDependents(taskId) : [];
  const isBlocked = currentTask?.is_blocked || false;
  const canStart = taskId ? canStartTask(taskId) : true;

  const handleAddDependency = async () => {
    if (!newDependency.taskId || !newDependency.dependsOnTaskId) return;

    await createTaskDependency(
      newDependency.taskId,
      newDependency.dependsOnTaskId,
      newDependency.dependencyType,
      newDependency.lagDays
    );

    setShowAddDialog(false);
    setNewDependency({
      taskId: taskId || '',
      dependsOnTaskId: '',
      dependencyType: 'finish_to_start',
      lagDays: 0
    });
  };

  const getDependencyTypeLabel = (type: TaskDependency['dependency_type']) => {
    switch (type) {
      case 'finish_to_start': return 'Finish-to-Start';
      case 'start_to_start': return 'Start-to-Start';
      case 'finish_to_finish': return 'Finish-to-Finish';
      case 'start_to_finish': return 'Start-to-Finish';
      default: return type;
    }
  };

  const getDependencyTypeDescription = (type: TaskDependency['dependency_type']) => {
    switch (type) {
      case 'finish_to_start': return 'Task cannot start until predecessor finishes';
      case 'start_to_start': return 'Task cannot start until predecessor starts';
      case 'finish_to_finish': return 'Task cannot finish until predecessor finishes';
      case 'start_to_finish': return 'Task cannot finish until predecessor starts';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'todo': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const availableTasks = tasks.filter(task => {
    if (!newDependency.taskId) return false;
    return task.id !== newDependency.taskId &&
           !taskDependencies.some(dep => dep.depends_on_task_id === task.id);
  });

  if (showAllDependencies) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Task Dependencies Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dependencies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No task dependencies configured yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dependencies.map((dependency) => (
                  <div key={dependency.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dependency.task?.title}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span>{dependency.depends_on_task?.title}</span>
                        </div>
                        <Badge variant="outline">
                          {getDependencyTypeLabel(dependency.dependency_type)}
                        </Badge>
                        {dependency.lag_days > 0 && (
                          <Badge variant="secondary">
                            +{dependency.lag_days} days
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTaskDependency(dependency.id)}
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {getDependencyTypeDescription(dependency.dependency_type)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taskId || !currentTask) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select a task to manage dependencies.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task Status Alert */}
      {isBlocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This task is blocked: {currentTask.blocked_reason}
          </AlertDescription>
        </Alert>
      )}

      {!canStart && !isBlocked && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            This task cannot start until all dependencies are completed.
          </AlertDescription>
        </Alert>
      )}

      {canStart && taskDependencies.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            All dependencies completed. This task is ready to start!
          </AlertDescription>
        </Alert>
      )}

      {/* Dependencies This Task Depends On */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Dependencies ({taskDependencies.length})
            </span>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Dependency
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task Dependency</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>This task: <strong>{currentTask.title}</strong></Label>
                    <p className="text-sm text-muted-foreground">
                      Select which task this one depends on
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="depends-on">Depends on task</Label>
                    <Select
                      value={newDependency.dependsOnTaskId}
                      onValueChange={(value) => setNewDependency(prev => ({ ...prev, dependsOnTaskId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                              {task.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dependency-type">Dependency Type</Label>
                    <Select
                      value={newDependency.dependencyType}
                      onValueChange={(value) => setNewDependency(prev => ({
                        ...prev,
                        dependencyType: value as TaskDependency['dependency_type']
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="finish_to_start">
                          <div>
                            <div className="font-medium">Finish-to-Start</div>
                            <div className="text-xs text-muted-foreground">Most common: predecessor must finish first</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="start_to_start">
                          <div>
                            <div className="font-medium">Start-to-Start</div>
                            <div className="text-xs text-muted-foreground">Both tasks start at the same time</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="finish_to_finish">
                          <div>
                            <div className="font-medium">Finish-to-Finish</div>
                            <div className="text-xs text-muted-foreground">Both tasks finish at the same time</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="start_to_finish">
                          <div>
                            <div className="font-medium">Start-to-Finish</div>
                            <div className="text-xs text-muted-foreground">Task finishes when predecessor starts</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lag-days">Lag Time (days)</Label>
                    <Input
                      id="lag-days"
                      type="number"
                      min="0"
                      value={newDependency.lagDays}
                      onChange={(e) => setNewDependency(prev => ({
                        ...prev,
                        lagDays: parseInt(e.target.value) || 0
                      }))}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Additional delay after dependency condition is met
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddDependency}
                      disabled={!newDependency.dependsOnTaskId}
                    >
                      Add Dependency
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taskDependencies.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No dependencies configured</p>
              <p className="text-sm">This task can start immediately</p>
            </div>
          ) : (
            <div className="space-y-3">
              {taskDependencies.map((dependency) => {
                const depTask = tasks.find(t => t.id === dependency.depends_on_task_id);
                const isCompleted = depTask?.status === 'done';

                return (
                  <div key={dependency.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        isCompleted ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      <div>
                        <div className="font-medium">{depTask?.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {getDependencyTypeLabel(dependency.dependency_type)}
                          {dependency.lag_days > 0 && ` + ${dependency.lag_days} days`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isCompleted ? 'default' : 'secondary'}>
                        {depTask?.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTaskDependency(dependency.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks That Depend On This One */}
      {taskDependents.length > 0 && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 rotate-180" />
                Dependent Tasks ({taskDependents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {taskDependents.map((dependency) => {
                  const depTask = tasks.find(t => t.id === dependency.task_id);

                  return (
                    <div key={dependency.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <div>
                          <div className="font-medium">{depTask?.title}</div>
                          <div className="text-sm text-muted-foreground">
                            Waiting for this task: {getDependencyTypeLabel(dependency.dependency_type)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">{depTask?.status}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TaskDependencyManager;
