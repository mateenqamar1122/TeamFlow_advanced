import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Loader2 } from "lucide-react";
import { useProjectHealthScore } from "@/hooks/useProjectHealthScore";
import { AIProjectHealthScoreDialog } from "./AIProjectHealthScoreDialog";
import { Project } from "@/hooks/useProjects";

interface ProjectHealthScoreWidgetProps {
  project: Project;
  workspaceId: string;
  compact?: boolean;
}

export function ProjectHealthScoreWidget({
  project,
  workspaceId,
  compact = false
}: ProjectHealthScoreWidgetProps) {
  const {
    loading,
    analysis,
    getLatestHealthScore,
    getHealthStatusColor,
    getHealthStatusIcon
  } = useProjectHealthScore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasHealthScore, setHasHealthScore] = useState(false);

  useEffect(() => {
    loadHealthScore();
  }, [project.id, workspaceId]);

  const loadHealthScore = async () => {
    try {
      const healthScore = await getLatestHealthScore(project.id, workspaceId);
      if (healthScore) {
        setHasHealthScore(true);
      } else {
        setHasHealthScore(false);
      }
    } catch (error) {
      console.error('Error loading health score:', error);
      setHasHealthScore(false);
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          className="h-6 px-2 text-xs"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Bot className="h-3 w-3 mr-1 text-purple-600" />
              {hasHealthScore && analysis ? (
                <Badge variant="secondary" className={`text-xs px-1 ${getHealthStatusColor(analysis.health_status)}`}>
                  {analysis.overall_score}%
                </Badge>
              ) : (
                "Health Score"
              )}
            </>
          )}
        </Button>

        <AIProjectHealthScoreDialog
          project={project}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium">AI Health Score</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "View Analysis"
          )}
        </Button>
      </div>

      {hasHealthScore && analysis ? (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${getHealthStatusColor(analysis.health_status)} border-0 text-xs`}>
                {getHealthStatusIcon(analysis.health_status)} {analysis.health_status}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600">
                {analysis.overall_score}%
              </div>
              <div className="text-xs text-muted-foreground">
                Overall Score
              </div>
            </div>
          </div>

          {analysis.insights.recommendations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-purple-200">
              <div className="text-xs text-muted-foreground mb-1">Top Recommendation:</div>
              <div className="text-xs text-gray-700 line-clamp-2">
                {analysis.insights.recommendations[0]}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
          <div className="text-center space-y-2">
            <Bot className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Generate AI health score for detailed project insights
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDialog}
              className="text-xs"
            >
              Generate Score
            </Button>
          </div>
        </div>
      )}

      <AIProjectHealthScoreDialog
        project={project}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
