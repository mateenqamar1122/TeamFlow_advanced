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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  CheckCircle,
  Activity,
  Settings,
  Zap,
  RefreshCw,
  Eye,
  Info,
  MoreVertical,
  Calendar,
  Users,
  BarChart3,
  Shield,
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp,
  Bell
} from 'lucide-react';
import { useDelayRiskDetection, type GenerateRiskAnalysisParams } from '@/hooks/useDelayRiskDetection';
import { formatDistanceToNow, parseISO, format } from 'date-fns';

interface DelayRiskDetectionProps {
  workspaceId: string;
  projectId?: string;
  taskIds?: string[];
  currentUserId?: string;
}

const DelayRiskDetection: React.FC<DelayRiskDetectionProps> = ({
  workspaceId,
  projectId,
  taskIds,
  currentUserId
}) => {
  const {
    taskRiskAssessments,
    projectAnalytics,
    riskAlerts,
    riskPatterns,
    settings,
    loading,
    analyzing,
    error,
    lastAnalysisResult,
    generateRiskAnalysis,
    fetchRiskAlerts,
    resolveAlert,
    updateSettings
  } = useDelayRiskDetection(workspaceId);

  const [selectedTab, setSelectedTab] = useState('overview');
  const [showResolvedAlerts, setShowResolvedAlerts] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [analysisParams, setAnalysisParams] = useState<GenerateRiskAnalysisParams>({
    workspace_id: workspaceId,
    task_ids: taskIds,
    project_id: projectId,
    analysis_type: 'workspace'
  });

  // Generate analysis
  const handleGenerateAnalysis = async () => {
    try {
      await generateRiskAnalysis(analysisParams);
    } catch (error: any) {
      console.error('Failed to generate analysis:', error);

      // Show user-friendly error message
      const errorMessage = error?.message?.includes('CORS')
        ? 'Network connectivity issue. Please check your connection and try again.'
        : error?.message?.includes('403')
        ? 'Permission error. Please contact your workspace administrator.'
        : error?.message || 'An unexpected error occurred during analysis.';

      alert(`Analysis failed: ${errorMessage}`);
    }
  };

  // Filter alerts by risk level
  const filteredAlerts = riskAlerts.filter(alert => {
    if (selectedRiskLevel === 'all') return true;
    return alert.severity_level === selectedRiskLevel;
  });

  // Filter assessments by risk level
  const filteredAssessments = taskRiskAssessments.filter(assessment => {
    if (selectedRiskLevel === 'all') return true;
    if (selectedRiskLevel === 'critical') return assessment.risk_score >= 0.8;
    if (selectedRiskLevel === 'high') return assessment.risk_score >= 0.6 && assessment.risk_score < 0.8;
    if (selectedRiskLevel === 'medium') return assessment.risk_score >= 0.4 && assessment.risk_score < 0.6;
    if (selectedRiskLevel === 'low') return assessment.risk_score < 0.4;
    return true;
  });

  // Get risk level color and text
  const getRiskLevelInfo = (score: number) => {
    if (score >= 0.8) return { level: 'Critical', color: 'bg-red-500', textColor: 'text-red-700' };
    if (score >= 0.6) return { level: 'High', color: 'bg-orange-500', textColor: 'text-orange-700' };
    if (score >= 0.4) return { level: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { level: 'Low', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  // Get severity badge variant
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load risk detection data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            AI Delay-Risk Detection
          </h2>
          <p className="text-muted-foreground">
            Intelligent risk assessment and delay prediction for your projects
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {riskAlerts.filter(a => !a.is_resolved).length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {riskAlerts.filter(a => !a.is_resolved).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">High Risk Tasks</p>
                      <p className="text-2xl font-bold text-red-600">
                        {taskRiskAssessments.filter(a => a.risk_score >= 0.6).length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {riskAlerts.filter(a => !a.is_resolved).length}
                      </p>
                    </div>
                    <Bell className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Risk Score</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {taskRiskAssessments.length > 0
                          ? (taskRiskAssessments.reduce((acc, a) => acc + a.risk_score, 0) / taskRiskAssessments.length * 100).toFixed(0) + '%'
                          : '0%'
                        }
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Patterns Found</p>
                      <p className="text-2xl font-bold text-green-600">
                        {riskPatterns.length}
                      </p>
                    </div>
                    <Brain className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Risk Analysis
                </CardTitle>
                <CardDescription>
                  Generate intelligent risk assessments for your tasks and projects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Analysis Type</Label>
                    <Select
                      value={analysisParams.analysis_type}
                      onValueChange={(value: any) =>
                        setAnalysisParams(prev => ({ ...prev, analysis_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workspace">Entire Workspace</SelectItem>
                        <SelectItem value="project">Specific Project</SelectItem>
                        <SelectItem value="task">Selected Tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {analysisParams.analysis_type === 'project' && (
                    <div className="space-y-2">
                      <Label>Project ID</Label>
                      <Input
                        value={analysisParams.project_id || ''}
                        onChange={(e) =>
                          setAnalysisParams(prev => ({ ...prev, project_id: e.target.value }))
                        }
                        placeholder="Enter project ID"
                      />
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleGenerateAnalysis}
                  disabled={analyzing}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Generate Risk Analysis
                    </>
                  )}
                </Button>

                {lastAnalysisResult && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Analysis complete: {lastAnalysisResult.analysis_metadata.tasks_analyzed} tasks analyzed,
                      {lastAnalysisResult.analysis_metadata.alerts_created} alerts created in{' '}
                      {(lastAnalysisResult.analysis_metadata.analysis_duration / 1000).toFixed(2)}s
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Recent High-Risk Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  High-Risk Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {filteredAssessments.filter(a => a.risk_score >= 0.6).slice(0, 5).map((assessment) => {
                      const riskInfo = getRiskLevelInfo(assessment.risk_score);
                      return (
                        <div key={assessment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={riskInfo.level === 'Critical' ? 'destructive' : 'default'}>
                                {riskInfo.level}
                              </Badge>
                              <span className="font-medium">Task #{assessment.task_id.slice(0, 8)}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Risk: {(assessment.risk_score * 100).toFixed(0)}%</span>
                              <span>Delay: {(assessment.delay_probability * 100).toFixed(0)}%</span>
                              {assessment.predicted_delay_days > 0 && (
                                <span>+{assessment.predicted_delay_days} days</span>
                              )}
                            </div>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-resolved"
                    checked={showResolvedAlerts}
                    onCheckedChange={setShowResolvedAlerts}
                  />
                  <Label htmlFor="show-resolved">Show resolved</Label>
                </div>
              </div>

              <Button onClick={() => fetchRiskAlerts(showResolvedAlerts)} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getSeverityVariant(alert.severity_level)}>
                            {alert.severity_level.charAt(0).toUpperCase() + alert.severity_level.slice(1)}
                          </Badge>
                          <Badge variant="outline">{alert.alert_type}</Badge>
                          {alert.is_resolved && (
                            <Badge variant="secondary">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>

                        <p className="font-medium mb-1">{alert.alert_message}</p>

                        <div className="text-sm text-muted-foreground">
                          Created {formatDistanceToNow(parseISO(alert.created_at), { addSuffix: true })}
                          {alert.resolved_at && (
                            <span> • Resolved {formatDistanceToNow(parseISO(alert.resolved_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!alert.is_resolved && (
                            <DropdownMenuItem onClick={() => resolveAlert(alert.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Resolved
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAlerts.length === 0 && (
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No alerts found</h3>
                <p className="text-muted-foreground">
                  {selectedRiskLevel === 'all'
                    ? "No risk alerts have been generated yet."
                    : `No ${selectedRiskLevel} severity alerts found.`
                  }
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="text-center py-12">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
            <p className="text-muted-foreground">
              Detailed analytics and insights will be available in the next update.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Risk Detection Settings</CardTitle>
              <CardDescription>Configure AI-powered delay risk detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enable-detection" className="text-base">Enable Risk Detection</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically analyze tasks for potential delays and risks
                  </p>
                </div>
                <Switch
                  id="enable-detection"
                  checked={settings?.enabled ?? true}
                  onCheckedChange={(enabled) => updateSettings({ enabled })}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Sensitivity Level</Label>
                  <Select
                    value={settings?.sensitivity_level ?? 'medium'}
                    onValueChange={(sensitivity_level: any) => updateSettings({ sensitivity_level })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Only critical risks</SelectItem>
                      <SelectItem value="medium">Medium - Balanced detection</SelectItem>
                      <SelectItem value="high">High - Detect all potential risks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Analysis Frequency</Label>
                  <Select
                    value={settings?.analysis_frequency ?? 'daily'}
                    onValueChange={(analysis_frequency: any) => updateSettings({ analysis_frequency })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DelayRiskDetection;
