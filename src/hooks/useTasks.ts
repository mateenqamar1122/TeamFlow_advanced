import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "High" | "Medium" | "Low";
  status: TaskStatus;
  assignee_name?: string;
  assignee_avatar?: string;
  assignee_id?: string;
  tags: string[];
  user_id: string;
  workspace_id?: string;
  project_id?: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  is_blocked?: boolean;
  blocked_reason?: string;
  is_recurring?: boolean;
  recurring_pattern_id?: string;
  parent_task_id?: string;
  created_by?: string;
  attachment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  workspace_id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  created_by: string;
  created_at: string;
  // Join fields
  task?: Task;
  depends_on_task?: Task;
}

export interface RecurringTaskPattern {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  template_task_id?: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval_value: number;
  days_of_week?: number[];
  day_of_month?: number;
  is_last_day_of_month?: boolean;
  month_of_year?: number;
  custom_pattern?: string;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  generate_days_ahead: number;
  auto_assign: boolean;
  auto_assign_to?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Join fields
  template_task?: Task;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [recurringPatterns, setRecurringPatterns] = useState<RecurringTaskPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { toast } = useToast();

  const fetchTasks = async () => {
    if (!user || !currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map(task => ({
        ...task,
        priority: task.priority as "High" | "Medium" | "Low",
        status: task.status as TaskStatus,
        tags: task.tags as string[],
      }));

      setTasks(typedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!user || !currentWorkspace) {
        toast({
          title: "Error",
          description: "You must be logged in and have a workspace selected to create tasks",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: user.id, workspace_id: currentWorkspace.id }])
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        priority: data.priority as "High" | "Medium" | "Low",
        status: data.status as TaskStatus,
        tags: data.tags as string[],
      };

      setTasks([typedData, ...tasks]);
      toast({
        title: "Success",
        description: "Task created successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        priority: data.priority as "High" | "Medium" | "Low",
        status: data.status as TaskStatus,
        tags: data.tags as string[],
      };

      setTasks(tasks.map(task => task.id === id ? typedData : task));
      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== id));
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  // TASK DEPENDENCIES FUNCTIONS
  const fetchTaskDependencies = async () => {
    if (!user || !currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .select(`
          *,
          task:tasks!task_dependencies_task_id_fkey(id, title, status),
          depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)
        `)
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      setDependencies(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch task dependencies",
        variant: "destructive",
      });
    }
  };

  const createTaskDependency = async (taskId: string, dependsOnTaskId: string, dependencyType: TaskDependency['dependency_type'] = 'finish_to_start', lagDays: number = 0) => {
    if (!user || !currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({
          workspace_id: currentWorkspace.id,
          task_id: taskId,
          depends_on_task_id: dependsOnTaskId,
          dependency_type: dependencyType,
          lag_days: lagDays,
          created_by: user.id
        })
        .select(`
          *,
          task:tasks!task_dependencies_task_id_fkey(id, title, status),
          depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)
        `)
        .single();

      if (error) throw error;

      setDependencies([...dependencies, data]);
      toast({
        title: "Success",
        description: "Task dependency created successfully",
      });

      // Refresh tasks to update blocked status
      await fetchTasks();

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task dependency",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTaskDependency = async (dependencyId: string) => {
    try {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;

      setDependencies(dependencies.filter(dep => dep.id !== dependencyId));
      toast({
        title: "Success",
        description: "Task dependency removed successfully",
      });

      // Refresh tasks to update blocked status
      await fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove task dependency",
        variant: "destructive",
      });
    }
  };

  const getTaskDependents = (taskId: string): TaskDependency[] => {
    return dependencies.filter(dep => dep.depends_on_task_id === taskId);
  };

  const getTaskDependencies = (taskId: string): TaskDependency[] => {
    return dependencies.filter(dep => dep.task_id === taskId);
  };

  const canStartTask = (taskId: string): boolean => {
    const taskDeps = getTaskDependencies(taskId);
    return taskDeps.every(dep => {
      const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
      return depTask?.status === 'done';
    });
  };

  // RECURRING TASKS FUNCTIONS
  const fetchRecurringPatterns = async () => {
    if (!user || !currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('recurring_task_patterns')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecurringPatterns(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch recurring patterns",
        variant: "destructive",
      });
    }
  };

  const createRecurringPattern = async (patternData: Omit<RecurringTaskPattern, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    if (!user || !currentWorkspace) return null;

    try {
      // Clean the pattern data to ensure no invalid values
      const cleanPatternData = Object.fromEntries(
        Object.entries(patternData).filter(([key, value]) =>
          value !== undefined && value !== '' && key !== 'id'
        )
      );

      console.log('Creating recurring pattern with data:', {
        ...cleanPatternData,
        workspace_id: currentWorkspace.id,
        created_by: user.id
      });

      const { data, error } = await supabase
        .from('recurring_task_patterns')
        .insert({
          ...cleanPatternData,
          workspace_id: currentWorkspace.id,
          created_by: user.id
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error creating recurring pattern:', error);
        throw error;
      }

      setRecurringPatterns([data, ...recurringPatterns]);
      toast({
        title: "Success",
        description: "Recurring pattern created successfully",
      });

      return data;
    } catch (error: any) {
      console.error('Error creating recurring pattern:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create recurring pattern",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRecurringPattern = async (id: string, updates: Partial<RecurringTaskPattern>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_task_patterns')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      setRecurringPatterns(recurringPatterns.map(pattern =>
        pattern.id === id ? data : pattern
      ));

      toast({
        title: "Success",
        description: "Recurring pattern updated successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update recurring pattern",
        variant: "destructive",
      });
    }
  };

  const deleteRecurringPattern = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_task_patterns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecurringPatterns(recurringPatterns.filter(pattern => pattern.id !== id));
      toast({
        title: "Success",
        description: "Recurring pattern deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recurring pattern",
        variant: "destructive",
      });
    }
  };

  const generateRecurringTasks = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_recurring_tasks');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated ${data || 0} recurring tasks`,
      });

      // Refresh tasks to show newly generated ones
      await fetchTasks();

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recurring tasks",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user && currentWorkspace) {
      fetchTasks();
      fetchTaskDependencies();
      fetchRecurringPatterns();
    } else {
      // Clear data when workspace changes or user logs out
      setTasks([]);
      setDependencies([]);
      setRecurringPatterns([]);
      setLoading(false);
    }
  }, [currentWorkspace]);

  return {
    tasks,
    dependencies,
    recurringPatterns,
    loading,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,

    // Dependencies
    createTaskDependency,
    deleteTaskDependency,
    getTaskDependents,
    getTaskDependencies,
    canStartTask,

  // Recurring Tasks
  createRecurringPattern,
  updateRecurringPattern,
  deleteRecurringPattern,
  generateRecurringTasks,
  fetchRecurringPatterns,

  // Helper function to get template task by ID
  getTemplateTask: (taskId: string) => tasks.find(t => t.id === taskId),
};
};