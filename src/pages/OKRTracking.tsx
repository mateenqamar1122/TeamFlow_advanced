import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Target,
  Plus,
  MoreVertical,
  TrendingUp,
  Calendar,
  Users,
  Flag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trophy,
  BarChart3
} from 'lucide-react';
import { useOKRTracking, Goal, KeyResult } from '@/hooks/useOKRTracking';
import { format, parseISO } from 'date-fns';

export default function OKRTracking() {
  const {
    goals,
    loading,
    getGoalStats,
    createGoal,
    updateGoal,
    createKeyResult,
    updateKeyResultProgress,
    addGoalUpdate
  } = useOKRTracking();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showCreateKR, setShowCreateKR] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const stats = getGoalStats();

  const handleCreateGoal = async (formData: FormData) => {
    const goalData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as Goal['category'],
      priority: formData.get('priority') as Goal['priority'],
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      quarter: formData.get('quarter') as string,
    };

    const result = await createGoal(goalData);
    if (result) {
      setShowCreateGoal(false);
    }
  };

  const handleCreateKeyResult = async (goalId: string, formData: FormData) => {
    const keyResultData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      measurement_type: formData.get('measurement_type') as KeyResult['measurement_type'],
      target_value: parseFloat(formData.get('target_value') as string),
      unit: formData.get('unit') as string,
      due_date: formData.get('due_date') as string,
    };

    const result = await createKeyResult(goalId, keyResultData);
    if (result) {
      setShowCreateKR(null);
    }
  };

  const updateProgress = async (goalId: string, newProgress: number) => {
    await updateGoal(goalId, { progress_percentage: newProgress });
    await addGoalUpdate(goalId, 'progress', `Progress updated to ${newProgress}%`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'behind': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals & OKRs</h1>
          <p className="text-muted-foreground">Track objectives and key results for your team</p>
        </div>
        <Button onClick={() => setShowCreateGoal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGoals}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeGoals} active, {stats.completedGoals} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
              <Progress value={stats.avgProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Goals completed this period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Key Results</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalKeyResults}</div>
              <p className="text-xs text-muted-foreground">
                {stats.keyResultCompletionRate}% completion rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onUpdate={updateProgress} />
            ))}

            {goals.length === 0 && (
              <Card className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No goals yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first goal to start tracking objectives and key results.
                </p>
                <Button onClick={() => setShowCreateGoal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        {['company', 'team', 'individual'].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid gap-4">
              {goals
                .filter((goal) => goal.category === category)
                .map((goal) => (
                  <GoalCard key={goal.id} goal={goal} onUpdate={updateProgress} />
                ))}

              {goals.filter((goal) => goal.category === category).length === 0 && (
                <Card className="p-8 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No {category} goals yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first {category} goal to start tracking objectives.
                  </p>
                  <Button onClick={() => setShowCreateGoal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Goal
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Goal</DialogTitle>
            <DialogDescription>
              Define a new objective with measurable key results.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateGoal(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Goal Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" name="start_date" type="date" required />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" name="end_date" type="date" required />
              </div>
            </div>

            <div>
              <Label htmlFor="quarter">Quarter (Optional)</Label>
              <Input id="quarter" name="quarter" placeholder="e.g., 2024-Q1" />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateGoal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Goal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Goal Card Component
function GoalCard({ goal, onUpdate }: { goal: Goal; onUpdate: (goalId: string, progress: number) => void }) {
  const [showKeyResultForm, setShowKeyResultForm] = useState(false);
  const { createKeyResult, updateKeyResultProgress } = useOKRTracking();

  const handleCreateKeyResult = async (formData: FormData) => {
    const keyResultData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      measurement_type: formData.get('measurement_type') as KeyResult['measurement_type'],
      target_value: parseFloat(formData.get('target_value') as string),
      unit: formData.get('unit') as string,
      due_date: formData.get('due_date') as string,
    };

    const result = await createKeyResult(goal.id, keyResultData);
    if (result) {
      setShowKeyResultForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'behind': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              <Badge className={getPriorityColor(goal.priority)}>
                {goal.priority}
              </Badge>
              <Badge className={getStatusColor(goal.status)}>
                {goal.status}
              </Badge>
            </div>
            {goal.description && (
              <CardDescription>{goal.description}</CardDescription>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit Goal</DropdownMenuItem>
              <DropdownMenuItem>Add Update</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete Goal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{format(parseISO(goal.start_date), 'MMM d')} - {format(parseISO(goal.end_date), 'MMM d, yyyy')}</span>
          </div>
          {goal.quarter && (
            <div className="flex items-center space-x-1">
              <Flag className="h-4 w-4" />
              <span>{goal.quarter}</span>
            </div>
          )}
          {goal.owner && (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{goal.owner.display_name}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{goal.progress_percentage}%</span>
          </div>
          <Progress value={goal.progress_percentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Key Results</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeyResultForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Key Result
            </Button>
          </div>

          {goal.key_results && goal.key_results.length > 0 ? (
            <div className="space-y-3">
              {goal.key_results.map((kr) => (
                <div key={kr.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium">{kr.title}</h5>
                      <Badge className={getStatusColor(kr.status)} variant="outline">
                        {kr.status}
                      </Badge>
                    </div>
                    {kr.due_date && (
                      <span className="text-sm text-muted-foreground">
                        Due {format(parseISO(kr.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>

                  {kr.description && (
                    <p className="text-sm text-muted-foreground">{kr.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">
                        {kr.current_value} / {kr.target_value} {kr.unit}
                      </span>
                      <Progress
                        value={(kr.current_value / kr.target_value) * 100}
                        className="w-32 h-2"
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newValue = prompt(`Update progress for "${kr.title}"`, kr.current_value.toString());
                        if (newValue && !isNaN(parseFloat(newValue))) {
                          updateKeyResultProgress(kr.id, parseFloat(newValue));
                        }
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p>No key results yet</p>
              <p className="text-sm">Add key results to measure this goal's success</p>
            </div>
          )}

          {/* Create Key Result Form */}
          {showKeyResultForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Key Result</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateKeyResult(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="kr-title">Title</Label>
                    <Input id="kr-title" name="title" required />
                  </div>

                  <div>
                    <Label htmlFor="kr-description">Description</Label>
                    <Textarea id="kr-description" name="description" rows={2} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="measurement_type">Type</Label>
                      <Select name="measurement_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target_value">Target</Label>
                      <Input id="target_value" name="target_value" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Input id="unit" name="unit" placeholder="e.g., users, $, %" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input id="due_date" name="due_date" type="date" />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowKeyResultForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Key Result</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
