import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  Calendar,
  BarChart3,
  Zap,
  RefreshCw,
  Trash2,
  Eye,
  Info
} from 'lucide-react';
import { useWorkloadForecast, type GenerateForecastParams, type RecordMetricsParams } from '@/hooks/useWorkloadForecast';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface WorkloadForecastingProps {
  workspaceId: string;
  currentUserId?: string;
}

const WorkloadForecasting: React.FC<WorkloadForecastingProps> = ({
  workspaceId,
  currentUserId
}) => {
  const {
    forecasts,
    metrics,
    loading,
    generatingForecast,
    error,
    lastForecastResponse,
    generateForecast,
    fetchForecasts,
    fetchMetrics,
    recordDailyMetrics,
    deleteForecast,
    getLatestForecast,
    getForecastsByType,
    getMetricsAnalytics,
    clearError,
    hasForecasts,
    hasMetrics
  } = useWorkloadForecast(workspaceId);

  // Form states for generating forecasts
  const [forecastParams, setForecastParams] = useState<GenerateForecastParams>({
    daysAhead: 7,
    forecastType: 'daily'
  });

  // Form states for recording metrics
  const [metricsForm, setMetricsForm] = useState<RecordMetricsParams>({
    userId: currentUserId || '',
    taskCount: 0,
    completedTasks: 0,
    hoursWorked: 0,
    productivityScore: 0.8,
    date: new Date().toISOString().split('T')[0]
  });

  const [selectedForecast, setSelectedForecast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const analytics = getMetricsAnalytics();
  const latestForecast = getLatestForecast();

  const handleGenerateForecast = async () => {
    await generateForecast(forecastParams);
  };

  const handleRecordMetrics = async () => {
    const success = await recordDailyMetrics(metricsForm);
    if (success) {
      // Reset form to defaults for next entry
      setMetricsForm(prev => ({
        ...prev,
        taskCount: 0,
        completedTasks: 0,
        hoursWorked: 0,
        date: new Date().toISOString().split('T')[0]
      }));
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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Workload Forecasting
          </h1>
          <p className="text-muted-foreground">
            AI-powered workload analysis and predictions using Google Gemini
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchForecasts}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleGenerateForecast}
            disabled={generatingForecast || !workspaceId}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {generatingForecast ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Forecast
              </>
            )}
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
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="forecasts">
            <Brain className="h-4 w-4 mr-2" />
            Forecasts
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <Activity className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Zap className="h-4 w-4 mr-2" />
            Generate
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Latest Forecast</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestForecast ? `${latestForecast.predicted_workload.toFixed(1)}h` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestForecast ? (
                    <>
                      {(latestForecast.confidence_score * 100).toFixed(1)}% confidence
                      <br />
                      {formatDistanceToNow(parseISO(latestForecast.created_at), { addSuffix: true })}
                    </>
                  ) : (
                    'No forecasts yet'
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
                {getTrendIcon(analytics.trend)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.averageProductivity * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.totalMetrics} days tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Task completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averageHoursWorked.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  Daily average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Latest Forecast Details */}
          {latestForecast && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Latest AI Forecast
                  <Badge className={getConfidenceColor(latestForecast.confidence_score)}>
                    {(latestForecast.confidence_score * 100).toFixed(1)}% confidence
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Generated {formatDistanceToNow(parseISO(latestForecast.created_at), { addSuffix: true })}
                  for {format(parseISO(latestForecast.forecast_date), 'PPP')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Resource Allocation
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {latestForecast.recommendations.resource_allocation}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Priority Adjustments
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {latestForecast.recommendations.priority_adjustments}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Risk Factors
                  </h4>
                  <div className="space-y-1">
                    {latestForecast.recommendations.risk_factors.map((risk, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {risk}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Optimization Tips
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {latestForecast.recommendations.optimization_tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Daily Breakdown */}
                {lastForecastResponse?.daily_breakdown && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Daily Breakdown
                      </h4>
                      <div className="space-y-2">
                        {lastForecastResponse.daily_breakdown.slice(0, 5).map((day, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm font-medium">
                              {format(parseISO(day.date), 'MMM dd')}
                            </span>
                            <span className="text-sm">{day.predicted_hours.toFixed(1)}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          {hasForecasts ? (
            <div className="space-y-4">
              {forecasts.map((forecast) => (
                <Card key={forecast.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {forecast.forecast_type.charAt(0).toUpperCase() + forecast.forecast_type.slice(1)} Forecast
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getConfidenceColor(forecast.confidence_score)}>
                          {(forecast.confidence_score * 100).toFixed(1)}% confidence
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteForecast(forecast.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Generated {formatDistanceToNow(parseISO(forecast.created_at), { addSuffix: true })}
                      • Target: {format(parseISO(forecast.forecast_date), 'PPP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Predicted Workload</span>
                        <span className="font-medium">{forecast.predicted_workload.toFixed(1)} hours/day</span>
                      </div>
                      <Progress value={Math.min(forecast.predicted_workload * 10, 100)} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Forecasts Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first AI workload forecast to get started
                  </p>
                  <Button onClick={() => setActiveTab('generate')}>
                    Generate Forecast
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          {/* Record Metrics Form */}
          <Card>
            <CardHeader>
              <CardTitle>Record Daily Metrics</CardTitle>
              <CardDescription>
                Track your daily workload to improve forecast accuracy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={metricsForm.date}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="taskCount">Total Tasks</Label>
                  <Input
                    id="taskCount"
                    type="number"
                    min="0"
                    value={metricsForm.taskCount}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, taskCount: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="completedTasks">Completed Tasks</Label>
                  <Input
                    id="completedTasks"
                    type="number"
                    min="0"
                    max={metricsForm.taskCount}
                    value={metricsForm.completedTasks}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, completedTasks: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="hoursWorked">Hours Worked</Label>
                  <Input
                    id="hoursWorked"
                    type="number"
                    min="0"
                    step="0.5"
                    max="24"
                    value={metricsForm.hoursWorked}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, hoursWorked: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="productivityScore">Productivity Score (0-1)</Label>
                  <Input
                    id="productivityScore"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={metricsForm.productivityScore}
                    onChange={(e) => setMetricsForm(prev => ({ ...prev, productivityScore: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <Button onClick={handleRecordMetrics} className="w-full">
                <Activity className="h-4 w-4 mr-2" />
                Record Metrics
              </Button>
            </CardContent>
          </Card>

          {/* Historical Metrics */}
          {hasMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Historical Metrics</CardTitle>
                <CardDescription>
                  Your recorded workload data over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {metrics.slice(0, 30).map((metric) => (
                      <div key={metric.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">{metric.date}</span>
                          <span className="text-xs text-muted-foreground">
                            {metric.completed_tasks}/{metric.task_count} tasks
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{metric.hours_worked}h</span>
                          <Badge variant="outline">
                            {(metric.productivity_score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Generate AI Forecast
              </CardTitle>
              <CardDescription>
                Configure parameters for your workload forecast using Google Gemini AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="daysAhead">Forecast Horizon (days)</Label>
                  <Select
                    value={forecastParams.daysAhead?.toString()}
                    onValueChange={(value) => setForecastParams(prev => ({ ...prev, daysAhead: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="forecastType">Forecast Type</Label>
                  <Select
                    value={forecastParams.forecastType}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                      setForecastParams(prev => ({ ...prev, forecastType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The AI will analyze your historical metrics, current tasks, and team capacity to generate accurate forecasts.
                  Better historical data improves forecast accuracy.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleGenerateForecast}
                disabled={generatingForecast || !workspaceId}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {generatingForecast ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Forecast generation status */}
          {lastForecastResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Latest Generation Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Metrics Analyzed:</span>
                    <div className="font-medium">{lastForecastResponse.metadata.metrics_analyzed}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tasks Analyzed:</span>
                    <div className="font-medium">{lastForecastResponse.metadata.tasks_analyzed}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Team Size:</span>
                    <div className="font-medium">{lastForecastResponse.metadata.team_size}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horizon:</span>
                    <div className="font-medium">{lastForecastResponse.metadata.forecast_horizon}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkloadForecasting;
