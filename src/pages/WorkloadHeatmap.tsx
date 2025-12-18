import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CalendarIcon,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useWorkloadHeatmap, HeatmapData } from '@/hooks/useWorkloadHeatmap';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { format, startOfWeek, endOfWeek, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function WorkloadHeatmap() {
  const {
    heatmapData,
    loading,
    getHeatmapStats,
    fetchWorkloadEntries,
    upsertWorkloadEntry,
    getUtilizationColor,
    getStatusColor
  } = useWorkloadHeatmap();

  const { teams, departments } = useTeamManagement();

  const [selectedTab, setSelectedTab] = useState('heatmap');
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showWorkloadDialog, setShowWorkloadDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HeatmapData | null>(null);

  const stats = getHeatmapStats();

  // Generate date range for heatmap
  const generateDateRange = () => {
    const dates = [];
    const currentDate = new Date(dateRange.start);
    while (currentDate <= dateRange.end) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  // Get unique users from heatmap data
  const getUniqueUsers = () => {
    const userMap = new Map();
    heatmapData.forEach(entry => {
      if (!userMap.has(entry.user_id)) {
        userMap.set(entry.user_id, {
          id: entry.user_id,
          name: entry.user_name,
          avatar_url: entry.avatar_url
        });
      }
    });
    return Array.from(userMap.values());
  };

  // Get workload entry for specific user and date
  const getWorkloadEntry = (userId: string, date: string): HeatmapData | undefined => {
    return heatmapData.find(entry => entry.user_id === userId && entry.date === date);
  };

  // Handle workload entry update
  const handleUpdateWorkload = async (formData: FormData) => {
    if (!editingEntry) return;

    const data = {
      user_id: editingEntry.user_id,
      date: editingEntry.date,
      planned_hours: parseFloat(formData.get('planned_hours') as string) || 8,
      actual_hours: parseFloat(formData.get('actual_hours') as string) || 0,
      overtime_hours: parseFloat(formData.get('overtime_hours') as string) || 0,
      availability_percentage: parseFloat(formData.get('availability') as string) || 100,
      notes: formData.get('notes') as string,
    };

    const result = await upsertWorkloadEntry(data);
    if (result) {
      setShowWorkloadDialog(false);
      setEditingEntry(null);
      // Refresh data
      fetchWorkloadEntries(dateRange.start, dateRange.end);
    }
  };

  // Load workload data when date range or filters change
  useEffect(() => {
    const userIds = selectedTeam !== 'all' ? undefined : [];
    const teamId = selectedTeam !== 'all' ? selectedTeam : undefined;
    fetchWorkloadEntries(dateRange.start, dateRange.end, userIds, teamId);
  }, [dateRange, selectedTeam, fetchWorkloadEntries]);

  const dates = generateDateRange();
  const users = getUniqueUsers();

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
          <h1 className="text-3xl font-bold">Workload Heatmap</h1>
          <p className="text-muted-foreground">Visualize team workload and capacity utilization</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchWorkloadEntries(dateRange.start, dateRange.end)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Utilization</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgUtilization}%</div>
              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(stats.avgUtilization, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overloadedPercentage}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.statusCounts.overloaded || 0} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalEntries} total entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.topOverloadedUsers.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Users frequently overloaded
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label>Date Range:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.start}
                    selected={{ from: dateRange.start, to: dateRange.end }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ start: range.from, end: range.to });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2">
              <Label>Department:</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label>Team:</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teams</SelectItem>
                  {teams
                    .filter(team => !selectedDepartment || (selectedDepartment !== 'all' && team.department_id === selectedDepartment))
                    .map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap" className="space-y-4">
          {/* Heatmap Legend */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">Utilization:</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="text-xs">Underloaded (&lt;70%)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} />
                      <span className="text-xs">Normal (70-100%)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }} />
                      <span className="text-xs">Busy (100-120%)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                      <span className="text-xs">Overloaded (&gt;120%)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#9ca3af' }} />
                      <span className="text-xs">Unavailable</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Heatmap Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  {/* Header Row */}
                  <div className="grid grid-flow-col gap-1 p-4 border-b bg-muted/50" style={{ gridTemplateColumns: `200px repeat(${dates.length}, 40px)` }}>
                    <div className="text-sm font-medium">Team Members</div>
                    {dates.map((date) => (
                      <div key={date} className="text-center">
                        <div className="text-xs font-medium">
                          {format(parseISO(date), 'dd')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(date), 'EEE')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Data Rows */}
                  {users.map((user) => (
                    <div key={user.id} className="grid grid-flow-col gap-1 p-4 border-b hover:bg-muted/25" style={{ gridTemplateColumns: `200px repeat(${dates.length}, 40px)` }}>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{user.name}</span>
                      </div>

                      {dates.map((date) => {
                        const entry = getWorkloadEntry(user.id, date);
                        const isWeekendDay = isWeekend(parseISO(date));

                        return (
                          <Tooltip key={date}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-8 h-8 rounded cursor-pointer border transition-all hover:scale-110",
                                  isWeekendDay ? "opacity-50" : "",
                                  !entry ? "bg-gray-100 border-gray-200" : ""
                                )}
                                style={{
                                  backgroundColor: entry ? getUtilizationColor(entry.utilization) : '#f3f4f6'
                                }}
                                onClick={() => {
                                  if (entry) {
                                    setEditingEntry(entry);
                                    setShowWorkloadDialog(true);
                                  }
                                }}
                              >
                                {entry && (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-white">
                                    {entry.utilization}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <div className="font-medium">{user.name}</div>
                                <div>{format(parseISO(date), 'MMM d, yyyy')}</div>
                                {entry ? (
                                  <>
                                    <div>Utilization: {entry.utilization}%</div>
                                    <div>Status: {entry.status}</div>
                                    <div>Planned: {entry.planned_hours}h</div>
                                    <div>Actual: {entry.actual_hours}h</div>
                                    {entry.overtime_hours > 0 && (
                                      <div>Overtime: {entry.overtime_hours}h</div>
                                    )}
                                  </>
                                ) : (
                                  <div>No data</div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}

                  {users.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No workload data</h3>
                      <p>Select a date range and team to view workload data.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Overloaded Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Most Overloaded Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topOverloadedUsers.slice(0, 5).map((user, index) => (
                    <div key={user.user_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-muted-foreground">#{index + 1}</div>
                        <div>
                          <div className="font-medium">{user.user_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.overloaded_days} overloaded days
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{user.avg_utilization}%</div>
                        <div className="text-sm text-red-600">{user.overload_percentage}% overload rate</div>
                      </div>
                    </div>
                  ))}
                  {(!stats?.topOverloadedUsers || stats.topOverloadedUsers.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground">
                      No overloaded users in this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Workload Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.statusCounts || {}).map(([status, count]) => {
                    const percentage = stats ? (count / stats.totalEntries) * 100 : 0;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getStatusColor(status as 'underloaded' | 'normal' | 'busy' | 'overloaded' | 'unavailable') }}
                          />
                          <span className="capitalize">{status.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: getStatusColor(status as any)
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-sm text-muted-foreground">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Workload Reports</CardTitle>
              <CardDescription>
                Generate detailed workload reports for analysis and planning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Reports Coming Soon</h3>
                <p>Detailed workload reports and analytics will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workload Entry Dialog */}
      <Dialog open={showWorkloadDialog} onOpenChange={setShowWorkloadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Workload</DialogTitle>
            <DialogDescription>
              {editingEntry && (
                <>
                  Update workload for {editingEntry.user_name} on{' '}
                  {format(parseISO(editingEntry.date), 'MMM d, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {editingEntry && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateWorkload(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planned_hours">Planned Hours</Label>
                  <Input
                    id="planned_hours"
                    name="planned_hours"
                    type="number"
                    step="0.25"
                    defaultValue={editingEntry.planned_hours}
                  />
                </div>
                <div>
                  <Label htmlFor="actual_hours">Actual Hours</Label>
                  <Input
                    id="actual_hours"
                    name="actual_hours"
                    type="number"
                    step="0.25"
                    defaultValue={editingEntry.actual_hours}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="overtime_hours">Overtime Hours</Label>
                  <Input
                    id="overtime_hours"
                    name="overtime_hours"
                    type="number"
                    step="0.25"
                    defaultValue={editingEntry.overtime_hours}
                  />
                </div>
                <div>
                  <Label htmlFor="availability">Availability (%)</Label>
                  <Input
                    id="availability"
                    name="availability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={100}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  placeholder="Optional notes about this day"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowWorkloadDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Workload</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
