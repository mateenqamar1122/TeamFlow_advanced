import { useState, useEffect, useCallback } from 'react';
import { useProjects } from './useProjects';
import { useTasks } from './useTasks';

export interface GanttTask {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  progress: number;
  duration: number;
  type: 'project' | 'task' | 'milestone';
  parent_id?: string;
  dependencies: string[];
  assignees: string[];
  priority: 'Low' | 'Medium' | 'High';
  status: string;
  description?: string;
  color?: string;
  collapsed?: boolean;
  children?: GanttTask[];
}

export interface GanttFilters {
  project_ids?: string[];
  assignees?: string[];
  priority?: ('Low' | 'Medium' | 'High')[];
  status?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
}

export interface TimelineViewOptions {
  viewMode: 'day' | 'week' | 'month' | 'quarter' | 'year';
  showCriticalPath: boolean;
  showDependencies: boolean;
  showProgress: boolean;
  showBaseline: boolean;
  groupBy: 'project' | 'assignee' | 'priority' | 'status' | 'none';
}

export function useGanttChart(filters: GanttFilters = {}) {
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewOptions, setViewOptions] = useState<TimelineViewOptions>({
    viewMode: 'month',
    showCriticalPath: true,
    showDependencies: true,
    showProgress: true,
    showBaseline: false,
    groupBy: 'project',
  });

  const { projects } = useProjects();
  const { tasks } = useTasks();

  // Convert projects and tasks to Gantt format
  const convertToGanttTasks = useCallback(() => {
    const ganttData: GanttTask[] = [];

    // Filter projects based on filters
    let filteredProjects = projects;
    if (filters.project_ids?.length) {
      filteredProjects = projects.filter(p => filters.project_ids!.includes(p.id));
    }

    filteredProjects.forEach(project => {
      const projectStartDate = new Date(project.created_at);
      const projectEndDate = new Date(project.due_date);

      // Skip projects outside date range
      if (filters.date_range) {
        if (projectEndDate < filters.date_range.start || projectStartDate > filters.date_range.end) {
          return;
        }
      }

      const projectTasks = tasks.filter(task => task.project_id === project.id);

      // Calculate project dates based on tasks if available
      let calculatedStartDate = projectStartDate;
      let calculatedEndDate = projectEndDate;

      if (projectTasks.length > 0) {
        const taskDates = projectTasks
          .filter(task => task.due_date)
          .map(task => new Date(task.due_date!));

        if (taskDates.length > 0) {
          calculatedStartDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
          calculatedEndDate = new Date(Math.max(...taskDates.map(d => d.getTime())));
        }
      }

      const projectGanttTask: GanttTask = {
        id: project.id,
        name: project.name,
        start_date: calculatedStartDate,
        end_date: calculatedEndDate,
        progress: project.progress || 0,
        duration: Math.ceil((calculatedEndDate.getTime() - calculatedStartDate.getTime()) / (1000 * 60 * 60 * 24)),
        type: 'project',
        dependencies: [],
        assignees: Array.isArray(project.members)
          ? project.members.filter(m => typeof m === 'object' && m.id).map(m => m.id)
          : [],
        priority: 'Medium', // Default priority for projects
        status: project.status,
        description: project.description,
        color: getProjectColor(project.status),
        collapsed: false,
        children: [],
      };

      // Add project tasks
      projectTasks.forEach(task => {
        if (!task.due_date) return;

        // Apply filters
        if (filters.assignees?.length && task.assignee_id && !filters.assignees.includes(task.assignee_id)) {
          return;
        }

        if (filters.priority?.length && !filters.priority.includes(task.priority)) {
          return;
        }

        if (filters.status?.length && !filters.status.includes(task.status)) {
          return;
        }

        const taskStartDate = task.created_at ? new Date(task.created_at) : new Date();
        const taskEndDate = new Date(task.due_date);

        // Skip tasks outside date range
        if (filters.date_range) {
          if (taskEndDate < filters.date_range.start || taskStartDate > filters.date_range.end) {
            return;
          }
        }

        const taskProgress = task.status === 'done' ? 100 :
                           task.status === 'in-progress' ? 50 : 0;

        const taskGanttTask: GanttTask = {
          id: task.id,
          name: task.title,
          start_date: taskStartDate,
          end_date: taskEndDate,
          progress: taskProgress,
          duration: Math.ceil((taskEndDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24)),
          type: 'task',
          parent_id: project.id,
          dependencies: [], // TODO: Extract from task metadata or relations
          assignees: task.assignee_id ? [task.assignee_id] : [],
          priority: task.priority,
          status: task.status,
          description: task.description,
          color: getTaskColor(task.priority, task.status),
        };

        projectGanttTask.children!.push(taskGanttTask);
      });

      ganttData.push(projectGanttTask);
    });

    return ganttData;
  }, [projects, tasks, filters]);

  // Get color based on project status
  const getProjectColor = useCallback((status: string) => {
    const colorMap: Record<string, string> = {
      'planning': '#6b7280',
      'active': '#10b981',
      'on-hold': '#f59e0b',
      'completed': '#3b82f6',
      'cancelled': '#ef4444',
    };
    return colorMap[status.toLowerCase()] || '#6b7280';
  }, []);

  // Get color based on task priority and status
  const getTaskColor = useCallback((priority: string, status: string) => {
    if (status === 'done') return '#10b981';
    if (status === 'in-progress') return '#3b82f6';

    const priorityColorMap: Record<string, string> = {
      'High': '#ef4444',
      'Medium': '#f59e0b',
      'Low': '#6b7280',
    };
    return priorityColorMap[priority] || '#6b7280';
  }, []);

  // Calculate critical path
  const calculateCriticalPath = useCallback((tasks: GanttTask[]): string[] => {
    // Simplified critical path calculation
    // In a real implementation, you'd use more sophisticated algorithms
    const criticalTasks: string[] = [];

    tasks.forEach(task => {
      if (task.type === 'project') {
        // Find tasks with the longest duration or highest priority
        const projectTasks = task.children || [];
        const longestTask = projectTasks.reduce((longest, current) =>
          current.duration > longest.duration ? current : longest
        , projectTasks[0]);

        if (longestTask) {
          criticalTasks.push(longestTask.id);
        }
      }
    });

    return criticalTasks;
  }, []);

  // Group tasks by specified criteria
  const groupTasks = useCallback((tasks: GanttTask[], groupBy: TimelineViewOptions['groupBy']): Record<string, GanttTask[]> => {
    if (groupBy === 'none') {
      return { 'All Tasks': tasks };
    }

    const groups: Record<string, GanttTask[]> = {};

    tasks.forEach(task => {
      let groupKey: string;

      switch (groupBy) {
        case 'project':
          groupKey = task.type === 'project' ? task.name : 'Unknown Project';
          break;
        case 'assignee':
          groupKey = task.assignees.length > 0 ? `User ${task.assignees[0]}` : 'Unassigned';
          break;
        case 'priority':
          groupKey = task.priority;
          break;
        case 'status':
          groupKey = task.status;
          break;
        default:
          groupKey = 'Other';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });

    return groups;
  }, []);

  // Update task progress
  const updateTaskProgress = useCallback(async (taskId: string, progress: number): Promise<boolean> => {
    try {
      // Update in local state immediately
      setGanttTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return { ...task, progress };
        }
        if (task.children) {
          return {
            ...task,
            children: task.children.map(child =>
              child.id === taskId ? { ...child, progress } : child
            )
          };
        }
        return task;
      }));

      return true;
    } catch (err) {
      console.error('Error updating task progress:', err);
      return false;
    }
  }, []);

  // Update task dates
  const updateTaskDates = useCallback(async (taskId: string, startDate: Date, endDate: Date): Promise<boolean> => {
    try {
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      setGanttTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return { ...task, start_date: startDate, end_date: endDate, duration };
        }
        if (task.children) {
          return {
            ...task,
            children: task.children.map(child =>
              child.id === taskId
                ? { ...child, start_date: startDate, end_date: endDate, duration }
                : child
            )
          };
        }
        return task;
      }));

      return true;
    } catch (err) {
      console.error('Error updating task dates:', err);
      return false;
    }
  }, []);

  // Get timeline scale based on view mode
  const getTimelineScale = useCallback((viewMode: TimelineViewOptions['viewMode']) => {
    const now = new Date();
    let start: Date, end: Date, unit: string;

    switch (viewMode) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
        unit = 'day';
        break;
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28);
        unit = 'week';
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        unit = 'month';
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 0);
        unit = 'quarter';
        break;
      case 'year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() + 2, 0, 0);
        unit = 'year';
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        unit = 'month';
    }

    return { start, end, unit };
  }, []);

  // Load and process data
  const loadGanttData = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const processedTasks = convertToGanttTasks();
      setGanttTasks(processedTasks);
    } catch (err) {
      console.error('Error loading Gantt data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  }, [convertToGanttTasks]);

  // Update view options
  const updateViewOptions = useCallback((newOptions: Partial<TimelineViewOptions>) => {
    setViewOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Initial load
  useEffect(() => {
    loadGanttData();
  }, [loadGanttData]);

  return {
    ganttTasks,
    loading,
    error,
    viewOptions,
    updateViewOptions,
    updateTaskProgress,
    updateTaskDates,
    calculateCriticalPath,
    groupTasks,
    getTimelineScale,
    refetch: loadGanttData,
  };
}
