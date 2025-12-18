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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bell,
  Plus,
  Clock,
  Clock3,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Settings,
  Send,
  Filter,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { useTeamReminders } from '@/hooks/useTeamReminders';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

export const TeamReminderDashboard: React.FC = () => {
  const {
    reminders,
    templates,
    teamAvailability,
    myAvailability,
    loading,
    upcomingReminders,
    overdueReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    acknowledgeReminder,
    snoozeReminder,
    createTemplate,
    updateMyAvailability,
    createQuickReminder,
  } = useTeamReminders();

  const { members } = useWorkspaceMembers();

  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    type: [] as string[],
    priority: [] as string[],
  });

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    reminder_type: 'custom' as any,
    priority: 'medium' as any,
    reminder_datetime: '',
    recipient_type: 'individual' as any,
    recipients: [] as string[],
    notification_channels: ['in_app'] as string[],
    recurring_pattern: null as any,
  });

  const handleCreateReminder = async () => {
    if (!newReminder.title || !newReminder.reminder_datetime) return;

    await createReminder(newReminder);
    setShowCreateDialog(false);
    setNewReminder({
      title: '',
      description: '',
      reminder_type: 'custom',
      priority: 'medium',
      reminder_datetime: '',
      recipient_type: 'individual',
      recipients: [],
      notification_channels: ['in_app'],
      recurring_pattern: null,
    });
  };

  const handleUseTemplate = (template: any) => {
    // Pre-fill the create reminder form with template data
    setNewReminder({
      title: template.template_content?.title || template.name,
      description: template.template_content?.description || template.description,
      reminder_type: template.reminder_type,
      priority: template.default_priority,
      reminder_datetime: '', // This will be set by user
      recipient_type: 'individual',
      recipients: [],
      notification_channels: template.default_channels || ['in_app'],
      recurring_pattern: null,
    });
    setShowCreateDialog(true); // Open the create dialog with pre-filled data
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'sent': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  const filteredReminders = reminders.filter(reminder => {
    if (filters.status.length > 0 && !filters.status.includes(reminder.status)) return false;
    if (filters.type.length > 0 && !filters.type.includes(reminder.reminder_type)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(reminder.priority)) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Reminders</h1>
          <p className="text-muted-foreground">Manage team notifications and reminders</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Reminder</DialogTitle>
              </DialogHeader>
              <CreateReminderForm
                data={newReminder}
                onChange={setNewReminder}
                onSubmit={handleCreateReminder}
                members={members}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingReminders.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueReminders.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-2xl font-bold">
                  {reminders.filter(r => r.status === 'active').length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{teamAvailability.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reminders">All Reminders</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="availability">Team Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => createQuickReminder('daily_standup', {
                    datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    team_members: members.map(m => m.user_id),
                  })}
                >
                  <Users className="w-6 h-6" />
                  Daily Standup
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => createQuickReminder('time_tracking', {})}
                >
                  <Clock className="w-6 h-6" />
                  Time Tracking
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <MessageSquare className="w-6 h-6" />
                  Custom Reminder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RemindersList
                reminders={upcomingReminders}
                onAcknowledge={acknowledgeReminder}
                onSnooze={snoozeReminder}
                onUpdate={updateReminder}
                onDelete={deleteReminder}
                showActions
              />
            </CardContent>
          </Card>

          {/* Overdue Reminders */}
          {overdueReminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Reminders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RemindersList
                  reminders={overdueReminders}
                  onAcknowledge={acknowledgeReminder}
                  onSnooze={snoozeReminder}
                  onUpdate={updateReminder}
                  onDelete={deleteReminder}
                  showActions
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                All Reminders
                <ReminderFilters filters={filters} onFiltersChange={setFilters} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RemindersList
                reminders={filteredReminders}
                onAcknowledge={acknowledgeReminder}
                onSnooze={snoozeReminder}
                onUpdate={updateReminder}
                onDelete={deleteReminder}
                showActions
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <TemplatesSection
            templates={templates}
            onCreate={createTemplate}
            onUseTemplate={handleUseTemplate}
          />
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <TeamAvailabilitySection
            teamAvailability={teamAvailability}
            myAvailability={myAvailability}
            onUpdateMyAvailability={updateMyAvailability}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Create Reminder Form Component
const CreateReminderForm: React.FC<{
  data: any;
  onChange: (data: any) => void;
  onSubmit: () => void;
  members: any[];
  loading: boolean;
}> = ({ data, onChange, onSubmit, members, loading }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="Enter reminder title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select
            value={data.reminder_type}
            onValueChange={(value) => onChange({ ...data, reminder_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="task_deadline">Task Deadline</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="project_milestone">Project Milestone</SelectItem>
              <SelectItem value="daily_standup">Daily Standup</SelectItem>
              <SelectItem value="weekly_review">Weekly Review</SelectItem>
              <SelectItem value="time_tracking">Time Tracking</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Enter reminder description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="datetime">Date & Time *</Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={data.reminder_datetime}
            onChange={(e) => onChange({ ...data, reminder_datetime: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={data.priority}
            onValueChange={(value) => onChange({ ...data, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Recipients</Label>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center space-x-2">
              <Checkbox
                id={`member-${member.user_id}`}
                checked={data.recipients.includes(member.user_id)}
                onCheckedChange={(checked) => {
                  const recipients = checked
                    ? [...data.recipients, member.user_id]
                    : data.recipients.filter((id: string) => id !== member.user_id);
                  onChange({ ...data, recipients });
                }}
              />
              <Label htmlFor={`member-${member.user_id}`} className="text-sm">
                {member.profiles?.full_name || member.profiles?.email || 'Unknown User'}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {}}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={loading || !data.title || !data.reminder_datetime}>
          <Send className="w-4 h-4 mr-2" />
          Create Reminder
        </Button>
      </div>
    </div>
  );
};

// Reminders List Component
const RemindersList: React.FC<{
  reminders: any[];
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  showActions?: boolean;
}> = ({ reminders, onAcknowledge, onSnooze, onUpdate, onDelete, showActions = true }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No reminders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="border rounded-lg p-4 flex items-start justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{reminder.title}</h4>
              <Badge variant={getPriorityColor(reminder.priority)}>
                {reminder.priority}
              </Badge>
              <Badge variant="outline">
                {reminder.reminder_type.replace('_', ' ')}
              </Badge>
            </div>

            {reminder.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {reminder.description}
              </p>
            )}

            <div className="text-sm text-muted-foreground">
              <span>
                {format(new Date(reminder.reminder_datetime), 'MMM dd, yyyy HH:mm')}
              </span>
              <span className="mx-2">•</span>
              <span>
                {formatDistanceToNow(new Date(reminder.reminder_datetime), { addSuffix: true })}
              </span>
            </div>

            {reminder.acknowledged_by.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">
                  Acknowledged by {reminder.acknowledged_by.length} member(s)
                </span>
              </div>
            )}
          </div>

          {showActions && (
            <div className="flex gap-1 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAcknowledge(reminder.id)}
              >
                <UserCheck className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSnooze(reminder.id, 30)}
              >
                <Clock3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(reminder.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Reminder Filters Component
const ReminderFilters: React.FC<{
  filters: any;
  onFiltersChange: (filters: any) => void;
}> = ({ filters, onFiltersChange }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Reminders</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="space-y-2">
              {['active', 'sent', 'cancelled', 'expired'].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.status.includes(status)}
                    onCheckedChange={(checked) => {
                      const newStatus = checked
                        ? [...filters.status, status]
                        : filters.status.filter((s: string) => s !== status);
                      onFiltersChange({ ...filters, status: newStatus });
                    }}
                  />
                  <Label htmlFor={`status-${status}`} className="capitalize">
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="space-y-2">
              {['low', 'medium', 'high', 'urgent'].map((priority) => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={filters.priority.includes(priority)}
                    onCheckedChange={(checked) => {
                      const newPriority = checked
                        ? [...filters.priority, priority]
                        : filters.priority.filter((p: string) => p !== priority);
                      onFiltersChange({ ...filters, priority: newPriority });
                    }}
                  />
                  <Label htmlFor={`priority-${priority}`} className="capitalize">
                    {priority}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
    reminder_type: 'custom',
    template_content: {
      title: '',
      description: '',
    },
    default_priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    default_channels: ['in_app'] as string[],
    default_advance_time: '1 hour',
    is_shared: false,
  });

  const handleCreateTemplate = async () => {
    if (!templateData.name.trim()) return;

    await onCreate(templateData);

    // Reset form
    setTemplateData({
      name: '',
      description: '',
      reminder_type: 'custom',
      template_content: {
        title: '',
        description: '',
      },
      default_priority: 'medium',
      default_channels: ['in_app'],
      default_advance_time: '1 hour',
      is_shared: false,
    });
    setShowCreateDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Reminder Templates
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Reminder Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={templateData.name}
                      onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Daily Standup Reminder"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-type">Reminder Type</Label>
                    <Select
                      value={templateData.reminder_type}
                      onValueChange={(value) => setTemplateData(prev => ({ ...prev, reminder_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="task_deadline">Task Deadline</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="project_milestone">Project Milestone</SelectItem>
                        <SelectItem value="daily_standup">Daily Standup</SelectItem>
                        <SelectItem value="weekly_review">Weekly Review</SelectItem>
                        <SelectItem value="sprint_planning">Sprint Planning</SelectItem>
                        <SelectItem value="retrospective">Retrospective</SelectItem>
                        <SelectItem value="time_tracking">Time Tracking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Template Description</Label>
                  <Textarea
                    id="template-description"
                    value={templateData.description}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this template is for"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-title">Default Reminder Title</Label>
                  <Input
                    id="template-title"
                    value={templateData.template_content.title}
                    onChange={(e) => setTemplateData(prev => ({
                      ...prev,
                      template_content: {
                        ...prev.template_content,
                        title: e.target.value
                      }
                    }))}
                    placeholder="Default title for reminders created from this template"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-content">Default Reminder Description</Label>
                  <Textarea
                    id="template-content"
                    value={templateData.template_content.description}
                    onChange={(e) => setTemplateData(prev => ({
                      ...prev,
                      template_content: {
                        ...prev.template_content,
                        description: e.target.value
                      }
                    }))}
                    placeholder="Default description for reminders created from this template"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-priority">Default Priority</Label>
                    <Select
                      value={templateData.default_priority}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                        setTemplateData(prev => ({ ...prev, default_priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-advance">Default Advance Time</Label>
                    <Select
                      value={templateData.default_advance_time}
                      onValueChange={(value) => setTemplateData(prev => ({ ...prev, default_advance_time: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5 minutes">5 minutes</SelectItem>
                        <SelectItem value="15 minutes">15 minutes</SelectItem>
                        <SelectItem value="30 minutes">30 minutes</SelectItem>
                        <SelectItem value="1 hour">1 hour</SelectItem>
                        <SelectItem value="2 hours">2 hours</SelectItem>
                        <SelectItem value="1 day">1 day</SelectItem>
                        <SelectItem value="1 week">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="template-shared"
                    checked={templateData.is_shared}
                    onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, is_shared: !!checked }))}
                  />
                  <Label htmlFor="template-shared">Share this template with the team</Label>
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
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => onUseTemplate?.(template)}
                  >
                    Use Template
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // TODO: Implement edit template functionality
                      console.log('Edit template:', template);
                    }}
                  >
                    <Edit className="w-4 h-4" />
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

// Team Availability Section Component
const TeamAvailabilitySection: React.FC<{
  teamAvailability: any[];
  myAvailability: any;
  onUpdateMyAvailability: (availability: any) => void;
}> = ({ teamAvailability, myAvailability, onUpdateMyAvailability }) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={myAvailability?.status || 'available'}
                  onValueChange={(value) => onUpdateMyAvailability({ status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="do_not_disturb">Do Not Disturb</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Message</Label>
                <Input
                  value={myAvailability?.status_message || ''}
                  onChange={(e) => onUpdateMyAvailability({ status_message: e.target.value })}
                  placeholder="Optional status message"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamAvailability.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    {member.user?.full_name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.user?.full_name || member.user?.email || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.status_message || 'No status message'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={member.status === 'available' ? 'default' : 'secondary'}
                >
                  {member.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamReminderDashboard;
