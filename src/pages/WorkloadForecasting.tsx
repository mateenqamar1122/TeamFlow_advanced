import React from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import WorkloadForecasting from '@/components/WorkloadForecasting';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, AlertCircle } from 'lucide-react';

const WorkloadForecastingPage: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace, loading, error } = useWorkspaceContext();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">Loading Workspace...</h2>
            <p className="text-muted-foreground">Please wait while we load your workspace data</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load workspace data: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
              <p className="text-muted-foreground">
                Please select a workspace to access workload forecasting
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <nav className="text-sm text-muted-foreground mb-2">
          <span className="hover:text-foreground cursor-pointer">
            {currentWorkspace.name}
          </span>
          <span className="mx-2">→</span>
          <span className="text-foreground font-medium">Workload Forecasting</span>
        </nav>
      </div>

      <WorkloadForecasting
        workspaceId={currentWorkspace.id}
        currentUserId={user?.id}
      />
    </div>
  );
};

export default WorkloadForecastingPage;
