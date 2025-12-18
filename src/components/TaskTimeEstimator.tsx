import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Zap,
  RefreshCw,
  Trash2,
  Calculator,
  History,
  Award,
  Info,
  PieChart
} from 'lucide-react';
import { 
  useTaskTimeEstimator, 
  type EstimationRequest, 
  type RecordCompletionParams 
} from '@/hooks/useTaskTimeEstimator';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface TaskTimeEstimatorProps {
  workspaceId: string;
  currentUserId?: string;
}

const TaskTimeEstimator: React.FC<TaskTimeEstimatorProps> = ({
  workspaceId,
  currentUserId
}) => {
  const {
    estimations,
    completionHistory,
    loading,
    generatingEstimation,
    error,
    lastEstimationResponse,
    generateEstimation,
    fetchEstimations,
    fetchCompletionHistory,
    recordCompletion,
    deleteEstimation,
    getLatestEstimation,
    getAccuracyMetrics,
    clearError,
    hasEstimations,
    hasCompletionHistory
  } = useTaskTimeEstimator(workspaceId);

  // Form states
  const [estimationForm, setEstimationForm] = useState<EstimationRequest>({
    task_title: '',
    task_description: '',
    task_priority: 'medium',
    task_complexity: 'medium',
    project_type: '',
    similar_tasks: true
  });

  const [completionForm, setCompletionForm] = useState<RecordCompletionParams>({
    task_title: '',
    task_description: '',
    task_priority: 'medium',
    task_complexity: 'medium',
    estimated_hours: 0,
    actual_hours: 0,
    completion_date: new Date().toISOString().split('T')[0]
  });

  const [activeTab, setActiveTab] = useState('estimate');

  const latestEstimation = getLatestEstimation();
  const accuracyMetrics = getAccuracyMetrics();

  const handleGenerateEstimation = async () => {
    if (!estimationForm.task_title.trim()) {
      return;
    }
    await generateEstimation(estimationForm);
  };

  const handleRecordCompletion = async () => {
    const success = await recordCompletion(completionForm);
    if (success) {
      // Reset form
      setCompletionForm({
        task_title: '',
        task_description: '',
        task_priority: 'medium',
        task_complexity: 'medium',
        estimated_hours: 0,
        actual_hours: 0,
        completion_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Task Completion Time Estimator
          </h1>
          <p className="text-muted-foreground">
            AI-powered task time estimation using Google Gemini and historical data
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              fetchEstimations();
              fetchCompletionHistory();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="estimate">
            <Calculator className="h-4 w-4 mr-2" />
            Estimate
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="accuracy">
            <Award className="h-4 w-4 mr-2" />
            Accuracy
          </TabsTrigger>
          <TabsTrigger value="record">
            <CheckCircle className="h-4 w-4 mr-2" />
            Record
          </TabsTrigger>
        </TabsList>

        {/* Overview Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Estimate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestEstimation ? formatHours(latestEstimation.estimated_hours) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestEstimation ? (
                  <>
                    {(latestEstimation.confidence_score * 100).toFixed(1)}% confidence
                    <br />
                    {formatDistanceToNow(parseISO(latestEstimation.created_at), { addSuffix: true })}
                  </>
                ) : (
                  'No estimates yet'
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
              {getTrendIcon(accuracyMetrics.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(accuracyMetrics.averageAccuracy * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {accuracyMetrics.estimatedCompletions} estimated tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estimations.length}</div>
              <p className="text-xs text-muted-foreground">
                Generated estimates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionHistory.length}</div>
              <p className="text-xs text-muted-foreground">
                Recorded completions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estimate Tab */}
        <TabsContent value="estimate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estimation Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Generate Time Estimate
                </CardTitle>
                <CardDescription>
                  Enter task details for AI-powered time estimation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="task_title">Task Title *</Label>
                  <Input
                    id="task_title"
                    placeholder="Enter task title..."
                    value={estimationForm.task_title}
                    onChange={(e) => setEstimationForm(prev => ({
                      ...prev,
                      task_title: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="task_description">Task Description</Label>
                  <Textarea
                    id="task_description"
                    placeholder="Describe the task in detail..."
                    rows={3}
                    value={estimationForm.task_description}
                    onChange={(e) => setEstimationForm(prev => ({
                      ...prev,
                      task_description: e.target.value
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={estimationForm.task_priority}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                        setEstimationForm(prev => ({ ...prev, task_priority: value }))}
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

                  <div>
                    <Label htmlFor="complexity">Complexity</Label>
                    <Select
                      value={estimationForm.task_complexity}
                      onValueChange={(value: 'low' | 'medium' | 'high' | 'very_high') =>
                        setEstimationForm(prev => ({ ...prev, task_complexity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="very_high">Very High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="project_type">Project Type</Label>
                  <Input
                    id="project_type"
                    placeholder="e.g., Frontend, Backend, Design..."
                    value={estimationForm.project_type}
                    onChange={(e) => setEstimationForm(prev => ({
                      ...prev,
                      project_type: e.target.value
                    }))}
                  />
                </div>

                <Button
                  onClick={handleGenerateEstimation}
                  disabled={generatingEstimation || !estimationForm.task_title.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  {generatingEstimation ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Estimate
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Latest Estimation Result */}
            {lastEstimationResponse && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Latest Estimation
                    </span>
                    <Badge className={getConfidenceColor(lastEstimationResponse.estimation.confidence_score)}>
                      {(lastEstimationResponse.estimation.confidence_score * 100).toFixed(1)}% confidence
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {lastEstimationResponse.estimation.task_title}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {formatHours(lastEstimationResponse.estimation.estimated_hours)}
                    </div>
                    <p className="text-sm text-muted-foreground">Estimated completion time</p>
                  </div>

                  <Separator />

                  {/* Time Breakdown */}
                  {lastEstimationResponse.time_breakdown && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <PieChart className="h-4 w-4" />
                        Time Breakdown
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(lastEstimationResponse.time_breakdown).map(([phase, hours]) => (
                          <div key={phase} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{phase}</span>
                            <span className="text-sm font-medium">{formatHours(hours)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Estimation Factors */}
                  <div>
                    <h4 className="font-medium mb-2">Analysis Summary</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {lastEstimationResponse.estimation.estimation_factors.complexity_analysis}
                    </p>

                    {lastEstimationResponse.estimation.estimation_factors.risk_factors.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Risk Factors
                        </h5>
                        <div className="space-y-1">
                          {lastEstimationResponse.estimation.estimation_factors.risk_factors.map((risk, index) => (
                            <Badge key={index} variant="outline" className="mr-2 mb-1">
                              {risk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  {lastEstimationResponse.recommendations && lastEstimationResponse.recommendations.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {lastEstimationResponse.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {hasEstimations ? (
            <div className="space-y-4">
              {estimations.map((estimation) => (
                <Card key={estimation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{estimation.task_title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getConfidenceColor(estimation.confidence_score)}>
                          {(estimation.confidence_score * 100).toFixed(1)}% confidence
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {estimation.task_priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {estimation.task_complexity}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEstimation(estimation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {formatDistanceToNow(parseISO(estimation.created_at), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-primary">
                        {formatHours(estimation.estimated_hours)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {estimation.similar_tasks_analyzed} similar tasks analyzed
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Estimates Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first task time estimate to get started
                  </p>
                  <Button onClick={() => setActiveTab('estimate')}>
                    Create Estimate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Accuracy Tab */}
        <TabsContent value="accuracy" className="space-y-6">
          {hasCompletionHistory ? (
            <>
              {/* Accuracy Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Overall Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(accuracyMetrics.averageAccuracy * 100).toFixed(1)}%
                    </div>
                    <Progress value={accuracyMetrics.averageAccuracy * 100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Accuracy Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(accuracyMetrics.trend)}
                      <span className="capitalize font-medium">{accuracyMetrics.trend}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Data Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {accuracyMetrics.estimatedCompletions}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      of {accuracyMetrics.totalCompletions} completions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Completion History */}
              <Card>
                <CardHeader>
                  <CardTitle>Completion History</CardTitle>
                  <CardDescription>
                    Task completion data used for improving estimates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {completionHistory.slice(0, 20).map((completion) => (
                        <div key={completion.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{completion.task_title}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(parseISO(completion.completion_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {completion.estimated_hours && (
                              <span className="text-muted-foreground">
                                Est: {formatHours(completion.estimated_hours)}
                              </span>
                            )}
                            <span className="font-medium">
                              Actual: {formatHours(completion.actual_hours)}
                            </span>
                            {completion.accuracy_score && (
                              <Badge variant={completion.accuracy_score >= 0.8 ? 'default' : 'secondary'}>
                                {(completion.accuracy_score * 100).toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Completion Data</h3>
                  <p className="text-muted-foreground mb-4">
                    Record task completions to track estimation accuracy
                  </p>
                  <Button onClick={() => setActiveTab('record')}>
                    Record Completion
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Record Tab */}
        <TabsContent value="record" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Record Task Completion
              </CardTitle>
              <CardDescription>
                Track actual completion times to improve future estimates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="completion_title">Task Title *</Label>
                  <Input
                    id="completion_title"
                    placeholder="Task title..."
                    value={completionForm.task_title}
                    onChange={(e) => setCompletionForm(prev => ({
                      ...prev,
                      task_title: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="completion_date">Completion Date</Label>
                  <Input
                    id="completion_date"
                    type="date"
                    value={completionForm.completion_date}
                    onChange={(e) => setCompletionForm(prev => ({
                      ...prev,
                      completion_date: e.target.value
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_hours">Estimated Hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Original estimate..."
                    value={completionForm.estimated_hours}
                    onChange={(e) => setCompletionForm(prev => ({
                      ...prev,
                      estimated_hours: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="actual_hours">Actual Hours *</Label>
                  <Input
                    id="actual_hours"
                    type="number"
                    step="0.5"
                    min="0.1"
                    placeholder="Time actually spent..."
                    value={completionForm.actual_hours}
                    onChange={(e) => setCompletionForm(prev => ({
                      ...prev,
                      actual_hours: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="completion_priority">Priority</Label>
                  <Select
                    value={completionForm.task_priority}
                    onValueChange={(value) => setCompletionForm(prev => ({
                      ...prev,
                      task_priority: value
                    }))}
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

                <div>
                  <Label htmlFor="completion_complexity">Complexity</Label>
                  <Select
                    value={completionForm.task_complexity}
                    onValueChange={(value) => setCompletionForm(prev => ({
                      ...prev,
                      task_complexity: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="very_high">Very High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="completion_description">Task Description</Label>
                <Textarea
                  id="completion_description"
                  placeholder="Optional: describe what was completed..."
                  rows={3}
                  value={completionForm.task_description}
                  onChange={(e) => setCompletionForm(prev => ({
                    ...prev,
                    task_description: e.target.value
                  }))}
                />
              </div>

              <Button
                onClick={handleRecordCompletion}
                disabled={!completionForm.task_title.trim() || completionForm.actual_hours <= 0}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Completion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskTimeEstimator;
