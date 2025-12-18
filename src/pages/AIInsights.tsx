import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

// Mock data for immediate functionality
const mockInsightsData = [
  {
    id: '1',
    title: 'Team Performance Analysis',
    description: 'Your team shows strong productivity with 85% task completion rate this month.',
    priority: 'medium',
    type: 'performance',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Resource Optimization Opportunity',
    description: 'AI detected potential 20% efficiency gain through better task allocation.',
    priority: 'high',
    type: 'optimization',
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Project Timeline Risk',
    description: 'Two projects showing potential delay indicators based on current progress patterns.',
    priority: 'high',
    type: 'risk',
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '4',
    title: 'Collaboration Success Pattern',
    description: 'Team collaboration efficiency increased by 15% after implementing daily standups.',
    priority: 'low',
    type: 'success',
    status: 'active',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

const AIInsights: React.FC = () => {
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState(mockInsightsData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: string}>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('team_performance');
  const [reportContext, setReportContext] = useState('');
  const [analytics, setAnalytics] = useState({
    teamProductivity: 78,
    projectCompletion: 85,
    resourceUtilization: 92,
    riskScore: 23
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'optimization': return <Activity className="h-4 w-4" />;
      case 'risk': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getActiveInsightsCount = () => insights.filter(i => i.status === 'active').length;

  // Functional methods for user interactions
  const handleRefreshInsights = useCallback(async () => {
    setIsGenerating(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add a new insight to demonstrate functionality
    const newInsight = {
      id: Date.now().toString(),
      title: 'New AI Analysis Complete',
      description: 'Latest workspace analysis shows improved team velocity and reduced bottlenecks.',
      priority: 'medium',
      type: 'performance',
      status: 'active',
      created_at: new Date().toISOString()
    };

    setInsights(prev => [newInsight, ...prev]);
    setIsGenerating(false);
  }, []);

  const handleResolveInsight = useCallback((insightId: string) => {
    setInsights(prev => prev.map(insight =>
      insight.id === insightId
        ? { ...insight, status: 'resolved' }
        : insight
    ));
  }, []);

  const handleDismissInsight = useCallback((insightId: string) => {
    setInsights(prev => prev.filter(insight => insight.id !== insightId));
  }, []);

  const handleSendChatMessage = useCallback(async () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsChatLoading(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    const aiResponse = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: `Based on your workspace data, I can see that ${currentMessage.toLowerCase().includes('performance') ? 'your team is performing well with strong collaboration patterns' : currentMessage.toLowerCase().includes('risk') ? 'there are some timeline risks to monitor, but nothing critical' : 'your workspace shows healthy metrics overall'}. Would you like me to dive deeper into any specific area?`,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, aiResponse]);
    setIsChatLoading(false);
  }, [currentMessage]);

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update analytics based on report type
    const reportAnalytics = {
      team_performance: { teamProductivity: 82, projectCompletion: 88, resourceUtilization: 95, riskScore: 18 },
      project_overview: { teamProductivity: 75, projectCompletion: 92, resourceUtilization: 87, riskScore: 25 },
      risk_assessment: { teamProductivity: 78, projectCompletion: 85, resourceUtilization: 92, riskScore: 35 }
    };

    setAnalytics(reportAnalytics[selectedReportType as keyof typeof reportAnalytics] || analytics);

    // Add generated insight
    const reportInsight = {
      id: Date.now().toString(),
      title: `${selectedReportType.replace('_', ' ').toUpperCase()} Report Generated`,
      description: `Custom analysis completed${reportContext ? ` with context: ${reportContext.substring(0, 100)}...` : ''}`,
      priority: 'medium',
      type: 'report',
      status: 'active',
      created_at: new Date().toISOString()
    };

    setInsights(prev => [reportInsight, ...prev]);
    setIsGenerating(false);

    // Switch to insights tab to show the result
    setActiveTab('insights');
  }, [selectedReportType, reportContext, analytics]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">AI Management Assistant</h1>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {getActiveInsightsCount()} Active Insights
          </Badge>
          {isGenerating && (
            <Badge variant="outline" className="flex items-center gap-1 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Generating...
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-xl font-bold">{insights.filter(i => i.priority === 'critical' && i.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Opportunities</p>
                <p className="text-xl font-bold">{insights.filter(i => i.type === 'optimization' && i.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Team Health</p>
                <p className="text-xl font-bold text-green-600">Good</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">AI Score</p>
                <p className="text-xl font-bold text-purple-600">85%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="chat">AI Assistant</TabsTrigger>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Management Insights</span>
                <Button
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={handleRefreshInsights}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Generating...' : 'Refresh Insights'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.filter(i => i.status === 'active').map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getInsightIcon(insight.type)}
                            <h3 className="font-semibold">{insight.title}</h3>
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{insight.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            Generated {new Date(insight.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveInsight(insight.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark as Resolved
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismissInsight(insight.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Team Productivity</span>
                    <span className="text-sm font-bold">{analytics.teamProductivity}%</span>
                  </div>
                  <Progress value={analytics.teamProductivity} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Project Completion Rate</span>
                    <span className="text-sm font-bold">{analytics.projectCompletion}%</span>
                  </div>
                  <Progress value={analytics.projectCompletion} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Resource Utilization</span>
                    <span className="text-sm font-bold">{analytics.resourceUtilization}%</span>
                  </div>
                  <Progress value={analytics.resourceUtilization} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Overall Risk Score</span>
                    <span className="text-sm font-bold text-orange-600">{analytics.riskScore}%</span>
                  </div>
                  <Progress value={analytics.riskScore} className="h-2 bg-orange-100" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Low Risk Projects</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">{insights.filter(i => i.priority === 'low').length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">High Risk Areas</span>
                    </div>
                    <span className="text-sm font-bold text-orange-600">{insights.filter(i => i.priority === 'high').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Insights Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.slice(0, 5).map((insight, index) => (
                  <div key={insight.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <p className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleDateString()} - {insight.type}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(insight.priority)} variant="secondary">
                      {insight.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Assistant Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="mb-4">Hi! I'm your AI management assistant. I can help you understand:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-white rounded border">📊 Performance trends</div>
                        <div className="p-2 bg-white rounded border">⚠️ Risk factors</div>
                        <div className="p-2 bg-white rounded border">💡 Optimization tips</div>
                        <div className="p-2 bg-white rounded border">📈 Growth opportunities</div>
                      </div>
                      <p className="mt-4 text-xs">Ask me anything about your workspace!</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border shadow-sm'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border shadow-sm px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask about your workspace performance, risks, or get insights..."
                    rows={2}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendChatMessage}
                    disabled={!currentMessage.trim() || isChatLoading}
                    className="self-end"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Custom Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Analysis Type</label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select analysis type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team_performance">Team Performance Analysis</SelectItem>
                    <SelectItem value="project_overview">Project Overview</SelectItem>
                    <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
                    <SelectItem value="resource_allocation">Resource Allocation</SelectItem>
                    <SelectItem value="productivity_analysis">Productivity Analysis</SelectItem>
                    <SelectItem value="strategic_recommendations">Strategic Recommendations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Analysis Context (Optional)</label>
                <Textarea
                  value={reportContext}
                  onChange={(e) => setReportContext(e.target.value)}
                  placeholder="Provide additional context for the analysis (e.g., specific concerns, goals, or areas of focus)..."
                  rows={4}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Report Preview</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Your {selectedReportType.replace('_', ' ')} report will include:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Current metrics analysis
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Trend identification
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Risk assessment
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Actionable recommendations
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating || !selectedReportType}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Analysis...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Analysis
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-yellow-600" />
                    <span className="font-medium text-yellow-900">Analysis in Progress</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    AI is analyzing your workspace data and generating insights...
                  </p>
                  <div className="mt-3">
                    <Progress value={50} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsights;
