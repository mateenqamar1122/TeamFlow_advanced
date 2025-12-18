import React from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import DelayRiskDetection from '@/components/DelayRiskDetection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const DelayRiskDetectionPage: React.FC = () => {
  const { currentWorkspace } = useWorkspaceContext();

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a workspace to access AI Delay-Risk Detection features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <DelayRiskDetection
        workspaceId={currentWorkspace.id}
      />
    </div>
  );
};

export default DelayRiskDetectionPage;
