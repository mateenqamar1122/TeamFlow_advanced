import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Shield, Clock, TrendingUp } from 'lucide-react';

interface TaskRiskIndicatorProps {
  taskId: string;
  riskScore?: number;
  delayProbability?: number;
  predictedDelayDays?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const TaskRiskIndicator: React.FC<TaskRiskIndicatorProps> = ({
  riskScore = 0,
  delayProbability = 0,
  predictedDelayDays = 0,
  size = 'sm',
  showDetails = true
}) => {
  // Calculate risk level based on score
  const getRiskLevel = (score: number) => {
    if (score >= 0.8) return { level: 'Critical', color: 'destructive', bgColor: 'bg-red-100', textColor: 'text-red-700' };
    if (score >= 0.6) return { level: 'High', color: 'destructive', bgColor: 'bg-orange-100', textColor: 'text-orange-700' };
    if (score >= 0.4) return { level: 'Medium', color: 'default', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' };
    if (score >= 0.2) return { level: 'Low', color: 'secondary', bgColor: 'bg-blue-100', textColor: 'text-blue-700' };
    return { level: 'Safe', color: 'secondary', bgColor: 'bg-green-100', textColor: 'text-green-700' };
  };

  const riskInfo = getRiskLevel(riskScore);

  // Don't show indicator for very low risk unless requested
  if (riskScore < 0.2 && !showDetails) return null;

  const getIcon = () => {
    if (riskScore >= 0.6) return <AlertTriangle className="h-3 w-3" />;
    if (riskScore >= 0.4) return <Clock className="h-3 w-3" />;
    if (riskScore >= 0.2) return <TrendingUp className="h-3 w-3" />;
    return <Shield className="h-3 w-3" />;
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1 rounded-full ${riskInfo.bgColor} ${riskInfo.textColor} ${sizeClasses[size]}`}>
              {getIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">Risk Level: {riskInfo.level}</p>
              <p>Risk Score: {(riskScore * 100).toFixed(0)}%</p>
              {delayProbability > 0 && <p>Delay Risk: {(delayProbability * 100).toFixed(0)}%</p>}
              {predictedDelayDays > 0 && <p>Predicted Delay: +{predictedDelayDays} days</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={riskInfo.color === 'destructive' ? 'destructive' : riskInfo.color === 'secondary' ? 'secondary' : 'default'} className={`gap-1 ${sizeClasses[size]}`}>
            {getIcon()}
            {riskInfo.level}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <p className="font-medium">AI Risk Assessment</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Risk Score:</span>
                <span className="ml-1 font-medium">{(riskScore * 100).toFixed(0)}%</span>
              </div>
              {delayProbability > 0 && (
                <div>
                  <span className="text-muted-foreground">Delay Risk:</span>
                  <span className="ml-1 font-medium">{(delayProbability * 100).toFixed(0)}%</span>
                </div>
              )}
              {predictedDelayDays > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Predicted Delay:</span>
                  <span className="ml-1 font-medium">+{predictedDelayDays} days</span>
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TaskRiskIndicator;
