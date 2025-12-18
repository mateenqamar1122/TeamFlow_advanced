import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Calendar,
  RefreshCw,
  Clock,
  Edit,
  Trash2,
  Play,
  Pause,
  Settings,
  Copy,
  Info
} from 'lucide-react';
import { useTasks, RecurringTaskPattern } from '@/hooks/useTasks';
import { format, addDays } from 'date-fns';

export const RecurringTaskManager: React.FC = () => {
  const {
    tasks,
    recurringPatterns,
    createRecurringPattern,
    updateRecurringPattern,
    deleteRecurringPattern,
    generateRecurringTasks,
    getTemplateTask,
  } = useTasks();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('patterns');
  const [selectedPattern, setSelectedPattern] = useState<RecurringTaskPattern | null>(null);

  const [newPattern, setNewPattern] = useState<Partial<RecurringTaskPattern>>({
    name: '',
    description: '',
    template_task_id: undefined,
    recurrence_type: 'daily',
    interval_value: 1,
    days_of_week: [],
    day_of_month: 1,
    is_last_day_of_month: false,
    month_of_year: 1,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: undefined,
    max_occurrences: undefined,
    generate_days_ahead: 7,
    auto_assign: true,
    auto_assign_to: undefined,
    is_active: true
  });

  const availableTemplateTasks = tasks.filter(task => task.status === 'done' || task.is_recurring === false);

  const handleCreatePattern = async () => {
    if (!newPattern.name || !newPattern.template_task_id) return;

    const patternData = {
      ...newPattern,
      workspace_id: '', // Will be set by the hook
      created_by: '', // Will be set by the hook
      created_at: '', // Will be set by the hook
      updated_at: '' // Will be set by the hook
    } as Omit<RecurringTaskPattern, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'updated_at'>;

    await createRecurringPattern(patternData);

    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setNewPattern({
      name: '',
      description: '',
      template_task_id: undefined,
      recurrence_type: 'daily',
      interval_value: 1,
      days_of_week: [],
      day_of_month: 1,
      is_last_day_of_month: false,
      month_of_year: 1,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: undefined,
      max_occurrences: undefined,
      generate_days_ahead: 7,
      auto_assign: true,
      auto_assign_to: undefined,
      is_active: true
    });
  };

  const togglePatternStatus = async (pattern: RecurringTaskPattern) => {
    await updateRecurringPattern(pattern.id, { is_active: !pattern.is_active });
  };

  const duplicatePattern = async (pattern: RecurringTaskPattern) => {
    const duplicateData = {
      ...pattern,
      name: `${pattern.name} (Copy)`,
      id: undefined,
      workspace_id: undefined,
      created_by: undefined,
      created_at: undefined,
      updated_at: undefined
    };
    delete duplicateData.id;
    delete duplicateData.workspace_id;
    delete duplicateData.created_by;
    delete duplicateData.created_at;
    delete duplicateData.updated_at;

    await createRecurringPattern(duplicateData);
  };

  const getRecurrenceDescription = (pattern: RecurringTaskPattern) => {
    const { recurrence_type, interval_value, days_of_week, day_of_month, is_last_day_of_month } = pattern;

    switch (recurrence_type) {
      case 'daily':
        return interval_value === 1 ? 'Daily' : `Every ${interval_value} days`;

      case 'weekly':
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (days_of_week && days_of_week.length > 0) {
          const selectedDays = days_of_week.map(day => dayNames[day]).join(', ');
          return interval_value === 1
            ? `Weekly on ${selectedDays}`
            : `Every ${interval_value} weeks on ${selectedDays}`;
        }
        return interval_value === 1 ? 'Weekly' : `Every ${interval_value} weeks`;

      case 'monthly':
        if (is_last_day_of_month) {
          return interval_value === 1
            ? 'Monthly on last day'
            : `Every ${interval_value} months on last day`;
        }
        return interval_value === 1
          ? `Monthly on day ${day_of_month}`
          : `Every ${interval_value} months on day ${day_of_month}`;

      case 'yearly':
        return interval_value === 1 ? 'Yearly' : `Every ${interval_value} years`;

      default:
        return 'Custom pattern';
    }
  };

  const getNextOccurrences = (pattern: RecurringTaskPattern, count: number = 3) => {
    const occurrences = [];
    let currentDate = new Date(pattern.start_date);

    for (let i = 0; i < count; i++) {
      occurrences.push(new Date(currentDate));

      // Simple increment logic - would be more complex in real implementation
      switch (pattern.recurrence_type) {
        case 'daily':
          currentDate = addDays(currentDate, pattern.interval_value);
          break;
        case 'weekly':
          currentDate = addDays(currentDate, 7 * pattern.interval_value);
          break;
        case 'monthly':
          currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + pattern.interval_value));
          break;
        case 'yearly':
          currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + pattern.interval_value));
          break;
      }

      if (pattern.end_date && currentDate > new Date(pattern.end_date)) {
        break;
      }
    }

    return occurrences;
  };

  const recurringTasks = tasks.filter(task => task.is_recurring);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recurring Tasks</h2>
          <p className="text-muted-foreground">Automate repetitive tasks with recurring patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateRecurringTasks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Tasks
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Pattern
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Recurring Task Pattern</DialogTitle>
              </DialogHeader>
              <RecurringPatternForm
                pattern={newPattern}
                onChange={setNewPattern}
                onSubmit={handleCreatePattern}
                onCancel={() => setShowCreateDialog(false)}
                availableTasks={availableTemplateTasks}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="patterns">Patterns ({recurringPatterns.length})</TabsTrigger>
          <TabsTrigger value="generated">Generated Tasks ({recurringTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          {recurringPatterns.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Recurring Patterns</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first recurring task pattern to automate repetitive work.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Pattern
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recurringPatterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{pattern.name}</h3>
                          <Badge variant={pattern.is_active ? 'default' : 'secondary'}>
                            {pattern.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePatternStatus(pattern)}
                        >
                          {pattern.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicatePattern(pattern)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPattern(pattern)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecurringPattern(pattern.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pattern.description && (
                        <p className="text-muted-foreground">{pattern.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <RefreshCw className="w-4 h-4" />
                          <span>{getRecurrenceDescription(pattern)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>From {format(new Date(pattern.start_date), 'MMM dd, yyyy')}</span>
                        </div>
                        {pattern.template_task_id && getTemplateTask(pattern.template_task_id) && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Template: {getTemplateTask(pattern.template_task_id)?.title}</span>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-3 bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4" />
                          <span className="text-sm font-medium">Next Occurrences</span>
                        </div>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          {getNextOccurrences(pattern, 3).map((date, index) => (
                            <Badge key={index} variant="outline">
                              {format(date, 'MMM dd')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          {recurringTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Generated Tasks Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generated tasks from recurring patterns will appear here.
                </p>
                <Button onClick={generateRecurringTasks}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recurringTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">Recurring</Badge>
                          {task.due_date && (
                            <span>Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                          )}
                          <span>Status: {task.status}</span>
                        </div>
                      </div>
                      <Badge variant={
                        task.status === 'done' ? 'default' :
                        task.status === 'in-progress' ? 'secondary' : 'outline'
                      }>
                        {task.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Pattern Dialog */}
      {selectedPattern && (
        <Dialog open={!!selectedPattern} onOpenChange={() => setSelectedPattern(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Recurring Pattern</DialogTitle>
            </DialogHeader>
            <RecurringPatternForm
              pattern={selectedPattern}
              onChange={(updated) => setSelectedPattern({ ...selectedPattern, ...updated })}
              onSubmit={async () => {
                if (selectedPattern) {
                  await updateRecurringPattern(selectedPattern.id, selectedPattern);
                  setSelectedPattern(null);
                }
              }}
              onCancel={() => setSelectedPattern(null)}
              availableTasks={availableTemplateTasks}
              isEdit={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Form component for creating/editing recurring patterns
const RecurringPatternForm: React.FC<{
  pattern: Partial<RecurringTaskPattern>;
  onChange: (pattern: Partial<RecurringTaskPattern>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  availableTasks: any[];
  isEdit?: boolean;
}> = ({ pattern, onChange, onSubmit, onCancel, availableTasks, isEdit = false }) => {
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const toggleDayOfWeek = (day: number) => {
    const current = pattern.days_of_week || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    onChange({ ...pattern, days_of_week: updated });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pattern-name">Pattern Name *</Label>
          <Input
            id="pattern-name"
            value={pattern.name || ''}
            onChange={(e) => onChange({ ...pattern, name: e.target.value })}
            placeholder="e.g., Daily Standup"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template-task">Template Task *</Label>
          <Select
            value={pattern.template_task_id || ''}
            onValueChange={(value) => onChange({ ...pattern, template_task_id: value || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template task" />
            </SelectTrigger>
            <SelectContent>
              {availableTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={pattern.description || ''}
          onChange={(e) => onChange({ ...pattern, description: e.target.value })}
          placeholder="Optional description for this recurring pattern"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recurrence-type">Recurrence Type</Label>
          <Select
            value={pattern.recurrence_type || 'daily'}
            onValueChange={(value) => onChange({
              ...pattern,
              recurrence_type: value as RecurringTaskPattern['recurrence_type']
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interval">Repeat Every</Label>
          <div className="flex items-center gap-2">
            <Input
              id="interval"
              type="number"
              min="1"
              value={pattern.interval_value || 1}
              onChange={(e) => onChange({
                ...pattern,
                interval_value: parseInt(e.target.value) || 1
              })}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {pattern.recurrence_type === 'daily' && 'day(s)'}
              {pattern.recurrence_type === 'weekly' && 'week(s)'}
              {pattern.recurrence_type === 'monthly' && 'month(s)'}
              {pattern.recurrence_type === 'yearly' && 'year(s)'}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly specific options */}
      {pattern.recurrence_type === 'weekly' && (
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day.value}`}
                  checked={(pattern.days_of_week || []).includes(day.value)}
                  onCheckedChange={() => toggleDayOfWeek(day.value)}
                />
                <Label htmlFor={`day-${day.value}`} className="text-sm">
                  {day.label.slice(0, 3)}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly specific options */}
      {pattern.recurrence_type === 'monthly' && (
        <div className="space-y-2">
          <Label>Monthly Options</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="last-day"
                checked={pattern.is_last_day_of_month || false}
                onCheckedChange={(checked) => onChange({
                  ...pattern,
                  is_last_day_of_month: !!checked
                })}
              />
              <Label htmlFor="last-day">Last day of month</Label>
            </div>

            {!pattern.is_last_day_of_month && (
              <div className="flex items-center gap-2">
                <Label htmlFor="day-of-month">Day of month:</Label>
                <Input
                  id="day-of-month"
                  type="number"
                  min="1"
                  max="31"
                  value={pattern.day_of_month || 1}
                  onChange={(e) => onChange({
                    ...pattern,
                    day_of_month: parseInt(e.target.value) || 1
                  })}
                  className="w-20"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={pattern.start_date || ''}
            onChange={(e) => onChange({ ...pattern, start_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">End Date (Optional)</Label>
          <Input
            id="end-date"
            type="date"
            value={pattern.end_date || ''}
            onChange={(e) => onChange({ ...pattern, end_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="generate-ahead">Generate Tasks (days ahead)</Label>
        <Input
          id="generate-ahead"
          type="number"
          min="1"
          max="365"
          value={pattern.generate_days_ahead || 7}
          onChange={(e) => onChange({
            ...pattern,
            generate_days_ahead: parseInt(e.target.value) || 7
          })}
        />
        <p className="text-xs text-muted-foreground">
          How many days in advance to generate tasks
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="auto-assign"
          checked={pattern.auto_assign || false}
          onCheckedChange={(checked) => onChange({ ...pattern, auto_assign: checked })}
        />
        <Label htmlFor="auto-assign">Auto-assign generated tasks</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is-active"
          checked={pattern.is_active !== false}
          onCheckedChange={(checked) => onChange({ ...pattern, is_active: checked })}
        />
        <Label htmlFor="is-active">Active pattern</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!pattern.name || !pattern.template_task_id}
        >
          {isEdit ? 'Update' : 'Create'} Pattern
        </Button>
      </div>
    </div>
  );
};

export default RecurringTaskManager;
