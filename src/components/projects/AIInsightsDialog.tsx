import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, FileCode, Loader2, FileText, Sparkles } from "lucide-react";
import { Project } from "@/hooks/useProjects";

interface AIInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  aiSummaryLoading: boolean;
  aiGeneratedSummary: string;
  onGenerateSummary: () => void;
  onOpenTemplateDialog: () => void;
}

export function AIInsightsDialog({
  open,
  onOpenChange,
  projects,
  aiSummaryLoading,
  aiGeneratedSummary,
  onGenerateSummary,
  onOpenTemplateDialog
}: AIInsightsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            AI Project Insights
          </DialogTitle>
          <DialogDescription>
            Get intelligent analysis and recommendations for your projects using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="space-y-6">
            {/* Project Portfolio Analysis */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Portfolio Overview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white/70 p-3 rounded border">
                  <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
                  <div className="text-sm text-muted-foreground">Total Projects</div>
                </div>
                <div className="bg-white/70 p-3 rounded border">
                  <div className="text-2xl font-bold text-green-600">
                    {projects.filter(p => p.status === "In Progress").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Projects</div>
                </div>
                <div className="bg-white/70 p-3 rounded border">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / Math.max(projects.length, 1))}%
                  </div>
                  <div className="text-sm text-muted-foreground">Avg. Completion</div>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-sm">
                <p className="mb-3">
                  🤖 <strong>AI Analysis:</strong> Your project portfolio shows
                  {projects.length === 0 ? " no active projects. Consider starting with a template to get organized."
                    : projects.length < 3 ? " a focused approach with few projects, allowing for deep concentration."
                    : projects.length < 6 ? " a balanced workload with good project diversity."
                    : " high project volume - consider prioritizing and delegating to maintain quality."
                  }
                </p>

                {projects.length > 0 && (
                  <>
                    <p className="mb-2">📊 <strong>Key Insights:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Most projects are in {
                        (() => {
                          const statusCounts = projects.reduce((acc, p) => {
                            acc[p.status] = (acc[p.status] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          const mostCommonStatus = Object.entries(statusCounts).reduce((a, b) =>
                            statusCounts[a[0]] > statusCounts[b[0]] ? a : b
                          )?.[0] || "Planning";
                          return mostCommonStatus;
                        })()
                      } phase</li>
                      <li>Average team size: {Math.round(projects.reduce((acc, p) => acc + p.members.length, 0) / Math.max(projects.length, 1))} members</li>
                      <li>Consider automating recurring tasks across similar projects</li>
                    </ul>
                  </>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 border border-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                AI Recommendations
              </h3>

              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-white/70 rounded border">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">High Priority</div>
                    <div className="text-xs text-muted-foreground">Focus on projects nearing deadlines - implement daily standups for better tracking</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/70 rounded border">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Resource Optimization</div>
                    <div className="text-xs text-muted-foreground">Consider reallocating team members from completed projects to active ones</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/70 rounded border">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <div className="font-medium text-sm">Process Improvement</div>
                    <div className="text-xs text-muted-foreground">Implement project templates for similar work to reduce setup time by 40%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Actions */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={onGenerateSummary}
                disabled={aiSummaryLoading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {aiSummaryLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Generate Project Analysis
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onOpenTemplateDialog}
                className="border-purple-200 hover:bg-purple-50"
              >
                <FileCode className="mr-2 h-4 w-4" />
                Explore Templates
              </Button>
            </div>

            {/* Display Generated Summary */}
            {aiGeneratedSummary && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  AI Generated Analysis
                </h4>
                <div className="prose prose-sm max-w-none text-sm whitespace-pre-line">
                  {aiGeneratedSummary}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

