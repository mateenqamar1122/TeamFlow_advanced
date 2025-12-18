import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Calendar, User, Flag, Clock } from 'lucide-react';
import { CommentsThread } from './CommentsThread';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useTasks } from '@/hooks/useTasks';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
  project_id?: string;
}

const STATUS_COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' }
] as const;

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export function TaskManagementBoard() {
  const { currentWorkspace } = useWorkspaceContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    tasks: fetchedTasks,
    loading: tasksLoading,
    updateTaskStatus,
    createTask
  } = useTasks(currentWorkspace?.id);

  useEffect(() => {
    if (fetchedTasks) {
      setTasks(fetchedTasks);
      setLoading(tasksLoading);
    }
  }, [fetchedTasks, tasksLoading]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Task['status'];
    const taskId = draggableId;

    // Optimistic update
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus }
          : task
      )
    );

    // Update in backend
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      // Revert on error
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status: source.droppableId as Task['status'] }
            : task
        )
      );
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Task Board</h2>
          <p className="text-muted-foreground">Manage and track your team's tasks</p>
        </div>
        <Button onClick={() => createTask({ title: 'New Task', status: 'todo' })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATUS_COLUMNS.map(column => (
            <div key={column.id} className="space-y-4">
              <div className={`p-4 rounded-lg ${column.color}`}>
                <h3 className="font-semibold text-lg">{column.title}</h3>
                <Badge variant="secondary" className="mt-1">
                  {getTasksByStatus(column.id).length}
                </Badge>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-muted/50' : ''
                    }`}
                  >
                    {getTasksByStatus(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <TaskCard
                            task={task}
                            provided={provided}
                            snapshot={snapshot}
                            workspaceId={currentWorkspace?.id || ''}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  provided: any;
  snapshot: any;
  workspaceId: string;
}

function TaskCard({ task, provided, snapshot, workspaceId }: TaskCardProps) {
  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`cursor-move transition-shadow ${
        snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-medium line-clamp-2">
            {task.title}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`text-xs ${PRIORITY_COLORS[task.priority]}`}
          >
            <Flag className="h-3 w-3 mr-1" />
            {task.priority}
          </Badge>

          {task.due_date && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(task.due_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {task.assigned_to && (
          <div className="flex items-center text-xs text-muted-foreground">
            <User className="h-3 w-3 mr-1" />
            Assigned
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {new Date(task.updated_at).toLocaleDateString()}
          </div>

          {/* Comments Thread Integration */}
          <CommentsThread
            entityType="task"
            entityId={task.id}
            workspaceId={workspaceId}
            trigger={
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                Comments
              </Button>
            }
            title={`Comments for "${task.title}"`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskManagementBoard;
