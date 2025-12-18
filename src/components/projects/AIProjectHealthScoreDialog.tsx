import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Target,
  Calendar,
  BarChart3,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Project } from "@/hooks/useProjects";
import { useProjectHealthScore, ProjectHealthScore } from "@/hooks/useProjectHealthScore";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";

interface AIProjectHealthScoreDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIProjectHealthScoreDialog({
  project,
  open,
  onOpenChange,
}: AIProjectHealthScoreDialogProps) {
  const { currentWorkspace } = useWorkspaceContext();
  const {
    loading,
    analysis,
    generateHealthScore,
    getLatestHealthScore,
    getHealthStatusColor,
    getHealthStatusIcon,
    setAnalysis
  } = useProjectHealthScore();

  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);

  useEffect(() => {
    if (open && project && currentWorkspace) {
      loadExistingAnalysis();
    }
  }, [open, project, currentWorkspace]);

  const loadExistingAnalysis = async () => {
    if (!project || !currentWorkspace) return;

    const existing = await getLatestHealthScore(project.id, currentWorkspace.id);
    if (existing) {
      setAnalysis(existing);
      setHasExistingAnalysis(true);
    } else {
      setHasExistingAnalysis(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!project || !currentWorkspace) return;

    await generateHealthScore(project.id, currentWorkspace.id);
    setHasExistingAnalysis(true);
  };

  const handleRefreshAnalysis = async () => {
    if (!project || !currentWorkspace) return;

    await generateHealthScore(project.id, currentWorkspace.id);
  };

  const MetricCard = ({ title, value, icon: Icon, description }: {
    title: string;
    value: number;
    icon: any;
    description?: string;
  }) => (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-lg font-bold">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );

  const InsightSection = ({ title, items, icon: Icon, variant = "default" }: {
    title: string;
    items: string[];
    icon: any;
    variant?: "default" | "warning" | "success" | "destructive";
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${
          variant === "warning" ? "text-yellow-600" :
          variant === "success" ? "text-green-600" :
          variant === "destructive" ? "text-red-600" :
          "text-muted-foreground"
        }`} />
        <h4 className="font-medium">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-muted-foreground pl-6 relative">
            <span className="absolute left-0 top-1.5 h-1.5 w-1.5 bg-current rounded-full" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            AI Project Health Score
          </DialogTitle>
          <DialogDescription>
            {project?.name ? `Comprehensive health analysis for "${project.name}"` : "Project health analysis"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Generate/Refresh Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {analysis && (
                  <>
                    <Badge className={`${getHealthStatusColor(analysis.health_status)} border-0`}>
                      {getHealthStatusIcon(analysis.health_status)} {analysis.health_status.toUpperCase()}
                    </Badge>
                    {analysis.created_at && (
                      <span className="text-xs text-muted-foreground">
                        Last analyzed: {new Date(analysis.created_at).toLocaleString()}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {hasExistingAnalysis && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAnalysis}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
                {!hasExistingAnalysis && (
                  <Button
                    onClick={handleGenerateAnalysis}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Generate Health Score
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your project health...
                  </p>
                </div>
              </div>
            )}

            {analysis && !loading && (
              <>
                {/* Overall Score */}
                <div className="text-center py-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {analysis.overall_score}%
                  </div>
                  <p className="text-muted-foreground">Overall Health Score</p>
                </div>

                <Separator />

                {/* Key Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Key Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetricCard
                      title="Completion Rate"
                      value={analysis.metrics.completion_rate}
                      icon={Target}
                      description="Tasks completed vs total tasks"
                    />
                    <MetricCard
                      title="Schedule Adherence"
                      value={analysis.metrics.schedule_adherence}
                      icon={Calendar}
                      description="Timeline performance"
                    />
                    <MetricCard
                      title="Team Productivity"
                      value={analysis.metrics.team_productivity}
                      icon={Users}
                      description="Activity and efficiency levels"
                    />
                    <MetricCard
                      title="Quality Indicators"
                      value={analysis.metrics.quality_indicators}
                      icon={CheckCircle}
                      description="Quality and deliverable metrics"
                    />
                  </div>
                </div>

                <Separator />

                {/* Predictions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Predictions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">Estimated Completion</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {new Date(analysis.predictions.estimated_completion_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="font-medium">Success Probability</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {analysis.predictions.completion_probability}%
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <TrendingDown className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <div className="font-medium">Budget Variance</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {analysis.predictions.budget_variance_prediction > 0 ? '+' : ''}
                        {analysis.predictions.budget_variance_prediction}%
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <InsightSection
                      title="Strengths"
                      items={analysis.insights.strengths}
                      icon={CheckCircle}
                      variant="success"
                    />
                    <InsightSection
                      title="Recommendations"
                      items={analysis.insights.recommendations}
                      icon={TrendingUp}
                      variant="default"
                    />
                  </div>
                  <div className="space-y-4">
                    <InsightSection
                      title="Concerns"
                      items={analysis.insights.concerns}
                      icon={AlertTriangle}
                      variant="warning"
                    />
                    <InsightSection
                      title="Key Risks"
                      items={analysis.insights.key_risks}
                      icon={AlertTriangle}
                      variant="destructive"
                    />
                  </div>
                </div>

                <Separator />

                {/* Trends */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Performance Trends
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress Velocity</span>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-lg font-bold">{analysis.trends.progress_velocity.toFixed(2)}%</div>
                      <div className="text-xs text-muted-foreground">per day</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Burndown Rate</span>
                        <Target className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-lg font-bold">{analysis.trends.burndown_rate.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">tasks/week</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Team Efficiency</span>
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-lg font-bold">{analysis.trends.team_efficiency.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">efficiency score</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!analysis && !loading && !hasExistingAnalysis && (
              <div className="text-center py-8 space-y-4">
                <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No Analysis Available</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Generate an AI-powered health score to get detailed insights about your project's performance,
                    risks, and recommendations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
