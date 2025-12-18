// Example integration of TaskRiskIndicator into existing task components

import React from 'react';
import TaskRiskIndicator from '@/components/TaskRiskIndicator';
import { useDelayRiskDetection } from '@/hooks/useDelayRiskDetection';

// Example: Adding risk indicator to task cards
const EnhancedTaskCard = ({ task, workspaceId }) => {
  const { taskRiskAssessments } = useDelayRiskDetection(workspaceId);

  // Find risk assessment for this task
  const riskAssessment = taskRiskAssessments.find(
    assessment => assessment.task_id === task.id
  );

  return (
    <div className="task-card p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium">{task.title}</h3>
        {riskAssessment && (
          <TaskRiskIndicator
            taskId={task.id}
            riskScore={riskAssessment.risk_score}
            delayProbability={riskAssessment.delay_probability}
            predictedDelayDays={riskAssessment.predicted_delay_days}
            size="sm"
            showDetails={false}
          />
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        {task.description}
      </p>

      {/* Existing task card content */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Due: {task.due_date}
        </span>
        <span className={`px-2 py-1 text-xs rounded ${
          task.priority === 'High' ? 'bg-red-100 text-red-700' :
          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {task.priority}
        </span>
      </div>

      {/* Show detailed risk info for high-risk tasks */}
      {riskAssessment && riskAssessment.risk_score >= 0.6 && (
        <div className="mt-3 p-2 bg-red-50 rounded border-l-2 border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-700 font-medium text-xs">⚠️ High Risk</span>
          </div>
          {riskAssessment.recommendations && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600">
                View AI Recommendations
              </summary>
              <div className="mt-1 space-y-1">
                {Object.entries(riskAssessment.recommendations).map(([key, values]) =>
                  Array.isArray(values) && values.length > 0 && (
                    <div key={key}>
                      <span className="font-medium capitalize">
                        {key.replace('_', ' ')}:
                      </span>
                      <ul className="ml-2 list-disc list-inside">
                        {values.slice(0, 2).map((rec, i) => (
                          <li key={i} className="text-red-600">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

// Example: Dashboard widget for high-risk tasks
const HighRiskTasksWidget = ({ workspaceId }) => {
  const { taskRiskAssessments, loading } = useDelayRiskDetection(workspaceId);

  const highRiskTasks = taskRiskAssessments.filter(
    assessment => assessment.risk_score >= 0.6
  );

  if (loading) {
    return <div className="p-4">Loading risk assessments...</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-red-700">⚠️ High-Risk Tasks</h3>
        <span className="bg-red-100 text-red-700 px-2 py-1 text-xs rounded">
          {highRiskTasks.length}
        </span>
      </div>

      {highRiskTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No high-risk tasks detected 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {highRiskTasks.slice(0, 5).map((assessment) => (
            <div key={assessment.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
              <div>
                <span className="font-medium text-sm">
                  Task #{assessment.task_id.slice(0, 8)}
                </span>
                <div className="text-xs text-muted-foreground">
                  Risk: {(assessment.risk_score * 100).toFixed(0)}% |
                  Delay: {(assessment.delay_probability * 100).toFixed(0)}%
                </div>
              </div>
              <TaskRiskIndicator
                taskId={assessment.task_id}
                riskScore={assessment.risk_score}
                delayProbability={assessment.delay_probability}
                predictedDelayDays={assessment.predicted_delay_days}
                size="sm"
                showDetails={false}
              />
            </div>
          ))}

          {highRiskTasks.length > 5 && (
            <p className="text-xs text-center text-muted-foreground">
              +{highRiskTasks.length - 5} more high-risk tasks
            </p>
          )}
        </div>
      )}

      <div className="mt-3 pt-2 border-t">
        <a
          href="/delay-risk-detection"
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          View full risk analysis →
        </a>
      </div>
    </div>
  );
};

export { EnhancedTaskCard, HighRiskTasksWidget };
