import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Brain } from 'lucide-react';

const AIInsightsTest: React.FC = () => {
  const testInsights = [
    {
      id: '1',
      title: 'Test Insight',
      description: 'This is a test insight to verify functionality.',
      priority: 'high',
      type: 'performance',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Brain className="h-6 w-6 text-blue-600" />
        AI Insights Component Test
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Functionality Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testInsights.map((insight) => (
              <div key={insight.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <h3 className="font-semibold">{insight.title}</h3>
                      <Badge className="bg-orange-500 text-white">
                        {insight.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-600">{insight.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                    <Button variant="outline" size="sm">
                      <XCircle className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-700">
          ✅ All UI components are loading correctly!
        </p>
      </div>
    </div>
  );
};

export default AIInsightsTest;
