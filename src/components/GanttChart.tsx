import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  Calendar,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Users,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useGanttChart, type GanttTask, type TimelineViewOptions } from '@/hooks/useGanttChart';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface GanttChartProps {
  height?: string;
  showSidebar?: boolean;
}

export function GanttChart({ height = "600px", showSidebar = true }: GanttChartProps) {
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const chartRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useGanttChart();

  const timelineScale = getTimelineScale(viewOptions.viewMode);
  const criticalPath = viewOptions.showCriticalPath ? calculateCriticalPath(ganttTasks) : [];
  const groupedTasks = groupTasks(ganttTasks, viewOptions.groupBy);

  // Generate timeline dates
  const timelineDates = eachDayOfInterval({
    start: timelineScale.start,
    end: timelineScale.end
  });

  // Toggle project collapse
  const toggleProjectCollapse = (projectId: string) => {
    setCollapsedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Calculate task position and width
  const getTaskPosition = (task: GanttTask) => {
    const totalDays = differenceInDays(timelineScale.end, timelineScale.start);
    const taskStartDays = differenceInDays(task.start_date, timelineScale.start);
    const taskDuration = differenceInDays(task.end_date, task.start_date) || 1;

    const left = Math.max(0, (taskStartDays / totalDays) * 100);
    const width = Math.min(100 - left, (taskDuration / totalDays) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  // Get task color
  const getTaskColor = (task: GanttTask) => {
    if (criticalPath.includes(task.id)) {
      return 'bg-red-500';
    }

    if (task.color) {
      return `bg-[${task.color}]`;
    }

    const colorMap = {
      project: 'bg-blue-500',
      task: 'bg-green-500',
      milestone: 'bg-purple-500',
    };

    return colorMap[task.type] || 'bg-gray-500';
  };

  // Handle task drag and drop (simplified)
  const handleTaskDrag = (taskId: string, newStartDate: Date, newEndDate: Date) => {
    updateTaskDates(taskId, newStartDate, newEndDate);
  };

  // Render task bar
  const renderTaskBar = (task: GanttTask, level: number = 0) => {
    const position = getTaskPosition(task);
    const isCollapsed = collapsedProjects.has(task.id);
    const isCritical = criticalPath.includes(task.id);

    return (
      <div key={task.id} className="relative">
        {/* Task Row */}
        <div className="flex items-center border-b border-border/50 hover:bg-accent/50 transition-colors">
          {/* Task Info */}
          <div className="w-80 p-2 border-r border-border/50" style={{ paddingLeft: `${level * 20 + 8}px` }}>
            <div className="flex items-center gap-2">
              {task.type === 'project' && task.children && task.children.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleProjectCollapse(task.id)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm truncate ${
                    task.type === 'project' ? 'text-primary' : 'text-foreground'
                  }`}>
                    {task.name}
                  </span>

                  {isCritical && (
                    <Badge variant="destructive" className="text-xs">
                      Critical
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{format(task.start_date, 'MMM dd')} - {format(task.end_date, 'MMM dd')}</span>
                  <span>•</span>
                  <span>{task.duration} days</span>

                  {task.assignees.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex -space-x-1">
                        {task.assignees.slice(0, 2).map((assigneeId, index) => (
                          <Avatar key={assigneeId} className="h-4 w-4 border border-background">
                            <AvatarFallback className="text-[10px]">
                              {assigneeId.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 2 && (
                          <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center text-[10px]">
                            +{task.assignees.length - 2}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 relative h-12 p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute h-8 rounded cursor-pointer transition-all hover:opacity-80 ${getTaskColor(task)} ${
                      selectedTask?.id === task.id ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    style={position}
                    onClick={() => setSelectedTask(task)}
                  >
                    {/* Progress overlay */}
                    {viewOptions.showProgress && task.progress > 0 && (
                      <div
                        className="absolute top-0 left-0 h-full bg-black/20 rounded-l"
                        style={{ width: `${task.progress}%` }}
                      />
                    )}

                    {/* Task type indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {task.type === 'milestone' && (
                        <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white" />
                      )}
                    </div>

                    {/* Task name overlay for longer bars */}
                    <div className="absolute inset-0 flex items-center px-2 text-white text-xs font-medium truncate">
                      {task.name}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-medium">{task.name}</div>
                    <div className="text-muted-foreground">
                      {format(task.start_date, 'MMM dd, yyyy')} - {format(task.end_date, 'MMM dd, yyyy')}
                    </div>
                    <div className="text-muted-foreground">
                      Duration: {task.duration} days
                    </div>
                    <div className="text-muted-foreground">
                      Progress: {task.progress}%
                    </div>
                    {task.description && (
                      <div className="text-muted-foreground mt-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Child tasks */}
        {task.children && task.children.length > 0 && !isCollapsed && (
          <div>
            {task.children.map(child => renderTaskBar(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render timeline header
  const renderTimelineHeader = () => {
    return (
      <div className="flex border-b border-border sticky top-0 bg-background z-10">
        <div className="w-80 p-3 border-r border-border font-medium">
          Task / Project
        </div>
        <div className="flex-1 relative">
          <div className="flex h-12">
            {viewOptions.viewMode === 'month' ? (
              // Month view - show months
              Array.from({ length: 12 }, (_, i) => {
                const monthDate = addDays(timelineScale.start, i * 30);
                return (
                  <div key={i} className="flex-1 border-r border-border/50 p-2 text-center text-sm font-medium">
                    {format(monthDate, 'MMM yyyy')}
                  </div>
                );
              })
            ) : (
              // Day/Week view - show days
              timelineDates.filter((_, index) => index % 7 === 0).map((date, index) => (
                <div key={index} className="flex-1 border-r border-border/50 p-2 text-center text-sm font-medium">
                  {format(date, 'MMM dd')}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading timeline...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-destructive">
            <BarChart3 className="h-12 w-12 mx-auto mb-4" />
            <p>Failed to load timeline data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Gantt Chart */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Project Timeline
            </CardTitle>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Select
                value={viewOptions.viewMode}
                onValueChange={(value: any) => updateViewOptions({ viewMode: value })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={viewOptions.groupBy}
                onValueChange={(value: any) => updateViewOptions({ groupBy: value })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">By Project</SelectItem>
                  <SelectItem value="assignee">By Assignee</SelectItem>
                  <SelectItem value="priority">By Priority</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="none">No Grouping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Switch
                checked={viewOptions.showProgress}
                onCheckedChange={(checked) => updateViewOptions({ showProgress: checked })}
              />
              <label>Show Progress</label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={viewOptions.showCriticalPath}
                onCheckedChange={(checked) => updateViewOptions({ showCriticalPath: checked })}
              />
              <label>Critical Path</label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={viewOptions.showDependencies}
                onCheckedChange={(checked) => updateViewOptions({ showDependencies: checked })}
              />
              <label>Dependencies</label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className={`${height} overflow-auto`} ref={chartRef}>
            {renderTimelineHeader()}

            <div className="relative">
              {Object.entries(groupedTasks).map(([groupName, tasks]) => (
                <div key={groupName}>
                  {viewOptions.groupBy !== 'none' && (
                    <div className="bg-muted/50 p-2 border-b border-border font-medium text-sm sticky top-12 z-5">
                      {groupName} ({tasks.length} items)
                    </div>
                  )}
                  {tasks.map(task => renderTaskBar(task))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Details Sidebar */}
      {showSidebar && selectedTask && (
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-lg">{selectedTask.name}</CardTitle>
            <Badge variant="secondary" className="w-fit">
              {selectedTask.type}
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {selectedTask.description && (
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start:</span>
                  <span>{format(selectedTask.start_date, 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End:</span>
                  <span>{format(selectedTask.end_date, 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{selectedTask.duration} days</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Progress</h4>
              <div className="space-y-2">
                <Progress value={selectedTask.progress} />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{selectedTask.progress}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge variant={
                    selectedTask.priority === 'High' ? 'destructive' :
                    selectedTask.priority === 'Medium' ? 'default' : 'secondary'
                  }>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline">{selectedTask.status}</Badge>
                </div>
              </div>
            </div>

            {selectedTask.assignees.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Assignees</h4>
                <div className="space-y-2">
                  {selectedTask.assignees.map(assigneeId => (
                    <div key={assigneeId} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {assigneeId.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">User {assigneeId.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTask.dependencies.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Dependencies</h4>
                <div className="text-sm text-muted-foreground">
                  {selectedTask.dependencies.length} dependencies
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GanttChart;
