import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  Tag,
  Paperclip,
  MessageSquare,
  Save,
  X
} from 'lucide-react';
import { Task, TaskStatus, useTasks } from '@/hooks/useTasks';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import TaskAttachments from './TaskAttachments';
import CommentsThread from './CommentsThread';
import MentionInput from './MentionInput';
import MentionText from './MentionText';
import { useMentions } from '@/hooks/useMentions';
import { useToast } from '@/hooks/use-toast';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
}

const TaskDialog: React.FC<TaskDialogProps> = ({
  open,
  onOpenChange,
  task,
  defaultStatus = 'todo'
}) => {
  const { createTask, updateTask } = useTasks();
  const { currentWorkspace } = useWorkspaceContext();
  const { processMentions } = useMentions({ workspaceId: currentWorkspace?.id });
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    status: 'todo' as TaskStatus,
    assignee_name: '',
    tags: '',
    due_date: '',
    start_date: '',
    estimated_hours: ''
  });

  // Update form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        status: task.status || 'todo',
        assignee_name: task.assignee_name || '',
        tags: task.tags ? task.tags.join(', ') : '',
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
        start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '',
        estimated_hours: task.estimated_hours ? task.estimated_hours.toString() : ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        status: defaultStatus,
        assignee_name: '',
        tags: '',
        due_date: '',
        start_date: '',
        estimated_hours: ''
      });
    }
  }, [task, defaultStatus]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Task title is required"
      });
      return;
    }

    if (!currentWorkspace) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No workspace selected"
      });
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        status: formData.status,
        assignee_name: formData.assignee_name.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        due_date: formData.due_date || undefined,
        start_date: formData.start_date || undefined,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        workspace_id: currentWorkspace.id
      };

      let taskId: string;

      if (task) {
        await updateTask(task.id, taskData);
        taskId = task.id;
        toast({
          title: "Task Updated",
          description: "Task has been updated successfully"
        });
      } else {
        const newTask = await createTask(taskData);
        taskId = newTask?.id || '';
        toast({
          title: "Task Created",
          description: "New task has been created successfully"
        });
      }

      // Process mentions in task description
      if (taskId && formData.description.includes('@') && processMentions) {
        try {
          await processMentions(
            formData.description,
            'task',
            taskId,
            window.location.href
          );
        } catch (mentionError) {
          console.warn('Error processing mentions:', mentionError);
          // Don't fail the task save due to mention processing issues
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task ? 'Edit Task' : 'Create New Task'}
            {task && (
              <Badge variant="outline" className="ml-2">
                {task.status.replace('-', ' ')}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {task ? 'Update task details and manage attachments' : 'Create a new task with all the details'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments
                {task?.attachment_count && task.attachment_count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {task.attachment_count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4 md:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter task title..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <MentionInput
                      value={formData.description}
                      onChange={(value) => handleInputChange('description', value)}
                      placeholder="Enter task description... Type @ to mention team members"
                      rows={3}
                      workspaceId={currentWorkspace?.id}
                      maxLength={1000}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee_name">Assignee</Label>
                  <Input
                    id="assignee_name"
                    value={formData.assignee_name}
                    onChange={(e) => handleInputChange('assignee_name', e.target.value)}
                    placeholder="Assign to..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_hours">Estimated Hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                    placeholder="Hours..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    placeholder="Enter tags separated by commas..."
                  />
                </div>
              </div>

              {task && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Created</p>
                        <p>{formatDate(task.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Updated</p>
                        <p>{formatDate(task.updated_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <div>
                        <p className="font-medium">ID</p>
                        <p className="font-mono text-xs">{task.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Attachments</p>
                        <p>{task.attachment_count || 0}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-6">
              {task ? (
                <TaskAttachments taskId={task.id} />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Save the task first to add attachments</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              {task && currentWorkspace ? (
                <div className="min-h-[400px]">
                  <CommentsThread
                    entityType="task"
                    entityId={task.id}
                    workspaceId={currentWorkspace.id}
                    title={`Comments for "${task.title}"`}
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Save the task first to add comments</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !formData.title.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDialog;
