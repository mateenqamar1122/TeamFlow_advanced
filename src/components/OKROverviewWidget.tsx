import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Trophy, Plus } from 'lucide-react';
import { useOKRTracking } from '@/hooks/useOKRTracking';
import { useNavigate } from 'react-router-dom';

export function OKROverviewWidget() {
  const { goals, loading, getGoalStats } = useOKRTracking();
  const navigate = useNavigate();
  const stats = getGoalStats();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals & OKRs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalGoals === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals & OKRs
          </CardTitle>
          <CardDescription>Track objectives and key results</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No goals set yet
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/okr-tracking')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create First Goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals & OKRs
            </CardTitle>
            <CardDescription>
              {stats.totalGoals} goals • {stats.completionRate}% complete
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/okr-tracking')}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">{stats.avgProgress}%</p>
              <p className="text-xs text-muted-foreground">Avg Progress</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">{stats.completedGoals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>

        {/* Active Goals */}
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium truncate flex-1">
                    {goal.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className={
                      goal.priority === 'high' || goal.priority === 'critical'
                        ? 'border-orange-200 text-orange-700'
                        : 'border-gray-200 text-gray-700'
                    }
                  >
                    {goal.priority}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {goal.progress_percentage}%
                </span>
              </div>
              <Progress
                value={goal.progress_percentage}
                className="h-1.5"
              />
            </div>
          ))}
        </div>

        {stats.activeGoals > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            +{stats.activeGoals - 3} more active goals
          </p>
        )}
      </CardContent>
    </Card>
  );
}
