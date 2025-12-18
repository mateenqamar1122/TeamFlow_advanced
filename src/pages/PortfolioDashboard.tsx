import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Briefcase,
  Plus,
  MoreVertical,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Target,
  FolderKanban,
  BarChart3,
  PieChart
} from 'lucide-react';
import { usePortfolioDashboard, Portfolio } from '@/hooks/usePortfolioDashboard';
import { format, parseISO } from 'date-fns';

export default function PortfolioDashboard() {
  const {
    portfolios,
    loading,
    getDashboardStats,
    createPortfolio,
    updatePortfolio,
    addProjectToPortfolio,
    removeProjectFromPortfolio
  } = usePortfolioDashboard();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const stats = getDashboardStats();

  const handleCreatePortfolio = async (formData: FormData) => {
    const portfolioData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      code: formData.get('code') as string,
      priority: formData.get('priority') as Portfolio['priority'],
      budget: parseFloat(formData.get('budget') as string) || undefined,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      tags: (formData.get('tags') as string)?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
    };

    const result = await createPortfolio(portfolioData);
    if (result) {
      setShowCreatePortfolio(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'planning': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'behind': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor your project portfolios</p>
        </div>
        <Button onClick={() => setShowCreatePortfolio(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Portfolio
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPortfolios}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activePortfolios} active, {stats.completedPortfolios} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
              <Progress value={stats.avgProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.budgetUtilization}% utilized
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.atRiskPortfolios}</div>
              <p className="text-xs text-muted-foreground">
                Portfolios needing attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                onUpdate={updatePortfolio}
                onAddProject={addProjectToPortfolio}
                onRemoveProject={removeProjectFromPortfolio}
              />
            ))}

            {portfolios.length === 0 && (
              <Card className="p-8 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No portfolios yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first portfolio to start managing your projects collectively.
                </p>
                <Button onClick={() => setShowCreatePortfolio(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Portfolio
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        {['active', 'completed'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <div className="grid gap-6">
              {portfolios
                .filter((portfolio) => portfolio.status === status)
                .map((portfolio) => (
                  <PortfolioCard
                    key={portfolio.id}
                    portfolio={portfolio}
                    onUpdate={updatePortfolio}
                    onAddProject={addProjectToPortfolio}
                    onRemoveProject={removeProjectFromPortfolio}
                  />
                ))}

              {portfolios.filter((portfolio) => portfolio.status === status).length === 0 && (
                <Card className="p-8 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No {status} portfolios</h3>
                  <p className="text-muted-foreground mb-4">
                    No portfolios with {status} status found.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Health Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Health Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['on_track', 'at_risk', 'behind', 'blocked'].map((health) => {
                    const count = portfolios.filter(p => p.health_status === health).length;
                    const percentage = portfolios.length > 0 ? (count / portfolios.length) * 100 : 0;
                    return (
                      <div key={health} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getHealthColor(health).replace('text-', 'bg-').split(' ')[0]}`} />
                          <span className="capitalize">{health.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Budget Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Budget Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Budget</span>
                    <span className="font-medium">${stats?.totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Spent</span>
                    <span className="font-medium text-red-600">${stats?.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Remaining</span>
                    <span className="font-medium text-green-600">${stats?.remainingBudget.toLocaleString()}</span>
                  </div>
                  <Progress
                    value={stats?.budgetUtilization || 0}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {stats?.budgetUtilization}% budget utilized
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Portfolio Dialog */}
      <Dialog open={showCreatePortfolio} onOpenChange={setShowCreatePortfolio}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
            <DialogDescription>
              Create a new portfolio to group and manage related projects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreatePortfolio(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Portfolio Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="code">Portfolio Code</Label>
                <Input id="code" name="code" placeholder="e.g., PROD-2024" />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input id="start_date" name="start_date" type="date" />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input id="end_date" name="end_date" type="date" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input id="budget" name="budget" type="number" step="0.01" />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" name="tags" placeholder="e.g., product, innovation, mobile" />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreatePortfolio(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Portfolio</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Portfolio Card Component
function PortfolioCard({
  portfolio,
  onUpdate,
  onAddProject,
  onRemoveProject
}: {
  portfolio: Portfolio;
  onUpdate: (id: string, updates: any) => Promise<any>;
  onAddProject: (portfolioId: string, projectId: string) => Promise<any>;
  onRemoveProject: (portfolioId: string, projectId: string) => Promise<any>;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'planning': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'behind': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-xl">{portfolio.name}</CardTitle>
              {portfolio.code && (
                <Badge variant="outline">{portfolio.code}</Badge>
              )}
              <Badge className={getPriorityColor(portfolio.priority)}>
                {portfolio.priority}
              </Badge>
              <Badge className={getStatusColor(portfolio.status)}>
                {portfolio.status.replace('_', ' ')}
              </Badge>
              <Badge className={getHealthColor(portfolio.health_status)}>
                {portfolio.health_status.replace('_', ' ')}
              </Badge>
            </div>
            {portfolio.description && (
              <CardDescription>{portfolio.description}</CardDescription>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit Portfolio</DropdownMenuItem>
              <DropdownMenuItem>Add Project</DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete Portfolio</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Portfolio Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{portfolio.metrics?.total_projects || 0}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${portfolio.budget ? portfolio.budget.toLocaleString() : '0'}
            </div>
            <div className="text-sm text-muted-foreground">Budget</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${portfolio.metrics?.spent_budget?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-muted-foreground">Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{portfolio.progress_percentage}%</div>
            <div className="text-sm text-muted-foreground">Progress</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{portfolio.progress_percentage}%</span>
          </div>
          <Progress value={portfolio.progress_percentage} className="h-2" />
        </div>

        {/* Timeline */}
        {(portfolio.start_date || portfolio.end_date) && (
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>
                {portfolio.start_date && format(parseISO(portfolio.start_date), 'MMM d')} -
                {portfolio.end_date && format(parseISO(portfolio.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Projects in Portfolio */}
        {portfolio.projects && portfolio.projects.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium">Projects ({portfolio.projects.length})</h4>
            <div className="grid gap-2">
              {portfolio.projects.map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.status} • {project.progress}% complete
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={project.progress} className="w-20 h-2" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveProject(portfolio.id, project.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FolderKanban className="h-8 w-8 mx-auto mb-2" />
            <p>No projects in this portfolio</p>
            <Button variant="outline" size="sm" className="mt-2">
              Add Project
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
