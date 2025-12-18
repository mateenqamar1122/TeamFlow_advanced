import { ManagementInsightData } from '@/hooks/useManagementInsights';

export interface AIManagementConfig {
  enabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in minutes
  cacheExpiry: number; // in minutes
  insightTypes: string[];
  fallbackMode: boolean;
}

export const defaultAIConfig: AIManagementConfig = {
  enabled: true,
  autoRefresh: true,
  refreshInterval: 30, // 30 minutes
  cacheExpiry: 240, // 4 hours
  insightTypes: [
    'team_performance',
    'project_overview',
    'resource_allocation',
    'risk_assessment',
    'strategic_recommendations',
    'productivity_analysis'
  ],
  fallbackMode: true
};

// Utility functions for AI Management Assistant

export const prioritizeInsights = (insights: ManagementInsightData[]): ManagementInsightData[] => {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return insights.sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by confidence (higher confidence first)
    const confidenceDiff = b.confidence - a.confidence;
    if (confidenceDiff !== 0) return confidenceDiff;

    // Finally by creation date (newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export const filterInsightsByCategory = (
  insights: ManagementInsightData[],
  category?: string
): ManagementInsightData[] => {
  if (!category || category === 'all') return insights;
  return insights.filter(insight => insight.category === category);
};

export const getInsightSummary = (insights: ManagementInsightData[]) => {
  const summary = {
    total: insights.length,
    byPriority: {
      critical: insights.filter(i => i.priority === 'critical').length,
      high: insights.filter(i => i.priority === 'high').length,
      medium: insights.filter(i => i.priority === 'medium').length,
      low: insights.filter(i => i.priority === 'low').length
    },
    byType: {
      performance: insights.filter(i => i.type === 'performance').length,
      risk: insights.filter(i => i.type === 'risk').length,
      opportunity: insights.filter(i => i.type === 'opportunity').length,
      recommendation: insights.filter(i => i.type === 'recommendation').length,
      alert: insights.filter(i => i.type === 'alert').length
    },
    byCategory: {
      team: insights.filter(i => i.category === 'team').length,
      project: insights.filter(i => i.category === 'project').length,
      resource: insights.filter(i => i.category === 'resource').length,
      timeline: insights.filter(i => i.category === 'timeline').length,
      quality: insights.filter(i => i.category === 'quality').length
    },
    avgConfidence: insights.length > 0
      ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)
      : 0,
    recentCount: insights.filter(i => {
      const daysSinceCreated = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 7;
    }).length
  };

  return summary;
};

export const formatInsightForNotification = (insight: ManagementInsightData) => {
  const priorityEmoji = {
    critical: '🚨',
    high: '⚠️',
    medium: '💡',
    low: 'ℹ️'
  };

  const typeEmoji = {
    performance: '📈',
    risk: '⚠️',
    opportunity: '🎯',
    recommendation: '💡',
    alert: '🚨'
  };

  return {
    title: `${priorityEmoji[insight.priority]} ${typeEmoji[insight.type]} ${insight.title}`,
    body: insight.description,
    priority: insight.priority,
    timestamp: insight.createdAt,
    actionRequired: insight.priority === 'critical' || insight.priority === 'high'
  };
};

export const generateInsightKey = (
  workspaceId: string,
  insightType: string,
  dateRange?: { start_date: string; end_date: string }
): string => {
  const baseKey = `${workspaceId}:${insightType}`;
  if (dateRange) {
    return `${baseKey}:${dateRange.start_date}:${dateRange.end_date}`;
  }
  return `${baseKey}:${new Date().toISOString().split('T')[0]}`;
};

export const isInsightExpired = (insight: ManagementInsightData, expiryMinutes: number = 240): boolean => {
  const createdAt = new Date(insight.createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
  return diffMinutes > expiryMinutes;
};

export const shouldRefreshInsights = (
  lastRefresh: Date | null,
  intervalMinutes: number = 30
): boolean => {
  if (!lastRefresh) return true;

  const now = new Date();
  const diffMinutes = (now.getTime() - lastRefresh.getTime()) / (1000 * 60);
  return diffMinutes >= intervalMinutes;
};

export const getMockInsightData = (workspaceId: string): ManagementInsightData[] => {
  return [
    {
      id: 'mock-1',
      type: 'performance',
      category: 'team',
      title: 'Team Productivity Analysis',
      description: 'Your team has maintained consistent productivity levels with room for improvement in collaboration.',
      priority: 'medium',
      impact: 'Moderate positive impact on project timelines',
      actionItems: [
        'Schedule weekly team sync meetings',
        'Implement peer code reviews',
        'Set up shared knowledge base'
      ],
      confidence: 85,
      trend: 'stable',
      metrics: { productivity: 78, collaboration: 71 },
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-2',
      type: 'risk',
      category: 'timeline',
      title: 'Upcoming Deadline Risk',
      description: 'Analysis indicates potential delays in 2 projects due to resource constraints.',
      priority: 'high',
      impact: 'Could affect client satisfaction and project delivery',
      actionItems: [
        'Review resource allocation for critical projects',
        'Consider hiring additional team members',
        'Negotiate deadline extensions where possible'
      ],
      confidence: 92,
      trend: 'down',
      metrics: { riskScore: 78, affectedProjects: 2 },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    {
      id: 'mock-3',
      type: 'opportunity',
      category: 'resource',
      title: 'Process Automation Opportunity',
      description: 'Identified repetitive tasks that could be automated to save 15% of team time.',
      priority: 'medium',
      impact: 'Significant time savings and improved team satisfaction',
      actionItems: [
        'Evaluate automation tools and workflows',
        'Pilot automation in development processes',
        'Train team on new automated systems'
      ],
      confidence: 88,
      trend: 'up',
      metrics: { timeSavings: 15, automationPotential: 82 },
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
    }
  ];
};

export const validateInsightData = (insight: any): insight is ManagementInsightData => {
  return (
    insight &&
    typeof insight.id === 'string' &&
    ['performance', 'risk', 'opportunity', 'recommendation', 'alert'].includes(insight.type) &&
    ['team', 'project', 'resource', 'timeline', 'quality'].includes(insight.category) &&
    typeof insight.title === 'string' &&
    typeof insight.description === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(insight.priority) &&
    typeof insight.impact === 'string' &&
    Array.isArray(insight.actionItems) &&
    typeof insight.confidence === 'number' &&
    insight.confidence >= 0 && insight.confidence <= 100 &&
    ['up', 'down', 'stable'].includes(insight.trend) &&
    typeof insight.createdAt === 'string'
  );
};

// Export all utilities as a namespace for convenience
export const AIManagementUtils = {
  prioritizeInsights,
  filterInsightsByCategory,
  getInsightSummary,
  formatInsightForNotification,
  generateInsightKey,
  isInsightExpired,
  shouldRefreshInsights,
  getMockInsightData,
  validateInsightData
};

export default AIManagementUtils;
