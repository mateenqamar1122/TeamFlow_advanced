import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Timer,
  DollarSign,
  BarChart3,
  Settings
} from 'lucide-react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { format, formatDistanceToNow } from 'date-fns';

export const TimeTrackingDashboard: React.FC = () => {
  const {
    timeEntries,
    currentEntry,
    settings,
    templates,
    loading,
    startTimer,
    stopTimer,
    updateTimeEntry,
    deleteTimeEntry,
    generateReport,
    createTemplate,
    updateSettings,
  } = useTimeTracking();

  const { tasks } = useTasks();
  const { projects } = useProjects();

  const [activeTab, setActiveTab] = useState('timer');
  const [timerData, setTimerData] = useState({
    description: '',
    task_id: '',
    project_id: '',
    tags: [] as string[],
    is_billable: false,
    hourly_rate: undefined as number | undefined,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filters, setFilters] = useState({
    start_date: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    project_id: 'all',
    user_id: 'all',
  });

  // Update current time every second for running timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentDuration = () => {
    if (!currentEntry) return '00:00:00';
    const startTime = new Date(currentEntry.start_time);
    const duration = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    return formatDuration(duration);
  };

  const handleStartTimer = async () => {
    await startTimer(timerData);
    setTimerData({
      description: '',
      task_id: '',
      project_id: '',
      tags: [],
      is_billable: false,
      hourly_rate: undefined,
    });
  };

  const handleStopTimer = async () => {
    if (currentEntry) {
      await stopTimer(currentEntry.id);
    }
  };

  const handleUseTemplate = (template: any) => {
    setTimerData({
      description: template.description || '',
      task_id: '',
      project_id: '',
      tags: template.tags || [],
      is_billable: template.is_billable || false,
      hourly_rate: template.hourly_rate,
    });
    setActiveTab('timer'); // Switch to timer tab
  };

  const calculateTotalTime = (entries: any[]) => {
    return entries.reduce((total, entry) => {
      return total + (entry.duration_seconds || 0);
    }, 0);
  };

  const calculateBillableAmount = (entries: any[]) => {
    return entries.reduce((total, entry) => {
      if (entry.is_billable && entry.hourly_rate && entry.duration_seconds) {
        return total + (entry.duration_seconds / 3600) * entry.hourly_rate;
      }
      return total;
    }, 0);
  };

  const todayEntries = timeEntries.filter(entry => {
    const entryDate = format(new Date(entry.start_time), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    return entryDate === today;
  });

  const thisWeekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.start_time);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return entryDate >= weekAgo;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground">Track and manage your time efficiently</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Time Tracking Settings</DialogTitle>
              </DialogHeader>
              <TimeTrackingSettings settings={settings} onUpdate={updateSettings} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{formatDuration(calculateTotalTime(todayEntries))}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{formatDuration(calculateTotalTime(thisWeekEntries))}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Billable (Week)</p>
                <p className="text-2xl font-bold">
                  ${calculateBillableAmount(thisWeekEntries).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{timeEntries.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Time Timer
                {currentEntry && (
                  <Badge variant="secondary" className="ml-auto">
                    Running: {getCurrentDuration()}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentEntry ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-primary">
                      {getCurrentDuration()}
                    </div>
                    <p className="text-muted-foreground mt-2">
                      {currentEntry.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button onClick={handleStopTimer} size="lg">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Timer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="What are you working on?"
                        value={timerData.description}
                        onChange={(e) => setTimerData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="project">Project</Label>
                        <Select
                          value={timerData.project_id}
                          onValueChange={(value) => setTimerData(prev => ({ ...prev, project_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task">Task</Label>
                        <Select
                          value={timerData.task_id}
                          onValueChange={(value) => setTimerData(prev => ({ ...prev, task_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select task" />
                          </SelectTrigger>
                          <SelectContent>
                            {tasks
                              .filter(task => !timerData.project_id || task.project_id === timerData.project_id)
                              .map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="billable"
                        checked={timerData.is_billable}
                        onCheckedChange={(checked) => setTimerData(prev => ({ ...prev, is_billable: checked }))}
                      />
                      <Label htmlFor="billable">Billable</Label>
                    </div>
                    {timerData.is_billable && (
                      <div className="space-y-2">
                        <Label htmlFor="rate">Hourly Rate ($)</Label>
                        <Input
                          id="rate"
                          type="number"
                          step="0.01"
                          value={timerData.hourly_rate || ''}
                          onChange={(e) => setTimerData(prev => ({
                            ...prev,
                            hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined
                          }))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <Button onClick={handleStartTimer} size="lg" disabled={loading}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                />
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                />
                <Select
                  value={filters.project_id}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, project_id: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <TimeEntriesList
                entries={timeEntries}
                onUpdate={updateTimeEntry}
                onDelete={deleteTimeEntry}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsSection
            timeEntries={timeEntries}
            onGenerateReport={generateReport}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesSection
            templates={templates}
            onCreate={createTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Time Tracking Settings Component
const TimeTrackingSettings: React.FC<{
  settings: any;
  onUpdate: (settings: any) => void;
}> = ({ settings, onUpdate }) => {
  const [formData, setFormData] = useState({
    default_hourly_rate: settings?.default_hourly_rate || '',
    require_description: settings?.require_description || false,
    allow_manual_time: settings?.allow_manual_time || true,
    round_to_minutes: settings?.round_to_minutes || 1,
    timezone: settings?.timezone || 'UTC',
  });

  const handleSave = () => {
    onUpdate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="default_rate">Default Hourly Rate ($)</Label>
        <Input
          id="default_rate"
          type="number"
          step="0.01"
          value={formData.default_hourly_rate}
          onChange={(e) => setFormData(prev => ({ ...prev, default_hourly_rate: parseFloat(e.target.value) || 0 }))}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="require_desc"
          checked={formData.require_description}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_description: checked }))}
        />
        <Label htmlFor="require_desc">Require description for time entries</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="allow_manual"
          checked={formData.allow_manual_time}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_manual_time: checked }))}
        />
        <Label htmlFor="allow_manual">Allow manual time entries</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="round_minutes">Round to nearest minutes</Label>
        <Select
          value={formData.round_to_minutes.toString()}
          onValueChange={(value) => setFormData(prev => ({ ...prev, round_to_minutes: parseInt(value) }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 minute</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="10">10 minutes</SelectItem>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </div>
  );
};

// Time Entries List Component
const TimeEntriesList: React.FC<{
  entries: any[];
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}> = ({ entries, onUpdate, onDelete }) => {
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="border rounded-lg p-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{entry.description || 'No description'}</span>
              {entry.is_billable && (
                <Badge variant="secondary">Billable</Badge>
              )}
              {entry.status === 'running' && (
                <Badge variant="destructive">Running</Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}
              {entry.end_time && ` - ${format(new Date(entry.end_time), 'HH:mm')}`}
            </div>
            {entry.project?.name && (
              <div className="text-sm text-blue-600">
                Project: {entry.project.name}
              </div>
            )}
            {entry.task?.title && (
              <div className="text-sm text-green-600">
                Task: {entry.task.title}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono font-bold">
              {formatDuration(entry.duration_seconds)}
            </div>
            {entry.is_billable && entry.hourly_rate && (
              <div className="text-sm text-muted-foreground">
                ${((entry.duration_seconds || 0) / 3600 * entry.hourly_rate).toFixed(2)}
              </div>
            )}
          </div>
          <div className="ml-4 flex gap-1">
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(entry.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Reports Section Component
const ReportsSection: React.FC<{
  timeEntries: any[];
  onGenerateReport: (config: any) => void;
}> = ({ timeEntries, onGenerateReport }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Reports feature coming soon...</p>
          <Button
            onClick={() => onGenerateReport({
              name: 'Weekly Report',
              report_type: 'summary',
              date_range_start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              date_range_end: format(new Date(), 'yyyy-MM-dd'),
            })}
            className="mt-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate Weekly Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Templates Section Component
const TemplatesSection: React.FC<{
  templates: any[];
  onCreate: (template: any) => void;
  onUseTemplate?: (template: any) => void;
}> = ({ templates, onCreate, onUseTemplate }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    default_duration_minutes: 60,
    tags: [] as string[],
    is_billable: false,
    hourly_rate: undefined as number | undefined,
    is_shared: false,
  });

  const handleCreateTemplate = async () => {
    if (!templateData.name.trim()) return;

    await onCreate(templateData);

    // Reset form
    setTemplateData({
      name: '',
      description: '',
      default_duration_minutes: 60,
      tags: [],
      is_billable: false,
      hourly_rate: undefined,
      is_shared: false,
    });
    setShowCreateDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Templates
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Time Entry Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={templateData.name}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Standup"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={templateData.description}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description for this template"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-duration">Default Duration (minutes)</Label>
                    <Input
                      id="template-duration"
                      type="number"
                      value={templateData.default_duration_minutes}
                      onChange={(e) => setTemplateData(prev => ({
                        ...prev,
                        default_duration_minutes: parseInt(e.target.value) || 60
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-rate">Hourly Rate ($)</Label>
                    <Input
                      id="template-rate"
                      type="number"
                      step="0.01"
                      value={templateData.hourly_rate || ''}
                      onChange={(e) => setTemplateData(prev => ({
                        ...prev,
                        hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-billable"
                    checked={templateData.is_billable}
                    onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_billable: checked }))}
                  />
                  <Label htmlFor="template-billable">Billable by default</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-shared"
                    checked={templateData.is_shared}
                    onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_shared: checked }))}
                  />
                  <Label htmlFor="template-shared">Share with team</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate} disabled={!templateData.name.trim()}>
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No templates yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                <h4 className="font-medium">{template.name}</h4>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onUseTemplate?.(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeTrackingDashboard;
