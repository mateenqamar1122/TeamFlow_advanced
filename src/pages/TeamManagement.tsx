import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Plus,
  MoreVertical,
  Building2,
  Crown,
  Star,
  UserPlus,
  Settings,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  Edit,
  Trash2
} from 'lucide-react';
import { useTeamManagement, Department, Team } from '@/hooks/useTeamManagement';

const DEPARTMENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

const TEAM_TYPES = [
  { value: 'functional', label: 'Functional', description: 'Permanent team organized by function' },
  { value: 'project', label: 'Project', description: 'Temporary team for specific projects' },
  { value: 'cross_functional', label: 'Cross-functional', description: 'Mixed expertise team' },
  { value: 'temporary', label: 'Temporary', description: 'Short-term team' },
];

export default function TeamManagement() {
  const {
    departments,
    teams,
    loading,
    getTeamStats,
    createDepartment,
    updateDepartment,
    createTeam,
    addTeamMember,
    removeTeamMember
  } = useTeamManagement();

  const [selectedTab, setSelectedTab] = useState('departments');
  const [showCreateDepartment, setShowCreateDepartment] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const stats = getTeamStats();

  const handleCreateDepartment = async (formData: FormData) => {
    const departmentData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      code: formData.get('code') as string,
      color: formData.get('color') as string || '#3b82f6',
      parent_department_id: (formData.get('parent_department_id') as string) || undefined,
      budget: parseFloat(formData.get('budget') as string) || undefined,
    };

    const result = await createDepartment(departmentData);
    if (result) {
      setShowCreateDepartment(false);
    }
  };

  const handleCreateTeam = async (formData: FormData) => {
    if (!selectedDepartment) {
      return;
    }

    const teamData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      department_id: selectedDepartment,
      team_type: formData.get('team_type') as Team['team_type'] || 'functional',
      max_members: parseInt(formData.get('max_members') as string) || 10,
    };

    const result = await createTeam(teamData);
    if (result) {
      setShowCreateTeam(false);
      setSelectedDepartment('');
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
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Organize departments and teams efficiently</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowCreateTeam(true)}>
            <Users className="h-4 w-4 mr-2" />
            New Team
          </Button>
          <Button onClick={() => setShowCreateDepartment(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            New Department
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDepartments}</div>
              <p className="text-xs text-muted-foreground">
                Organizational units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTeams}</div>
              <p className="text-xs text-muted-foreground">
                Active teams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                Team members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgTeamSize}</div>
              <p className="text-xs text-muted-foreground">
                Members per team
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4">
            {departments.map((department) => (
              <DepartmentCard
                key={department.id}
                department={department}
                onEdit={setEditingDepartment}
                onCreateTeam={(deptId) => {
                  setSelectedDepartment(deptId);
                  setShowCreateTeam(true);
                }}
              />
            ))}

            {departments.length === 0 && (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No departments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first department to start organizing your teams.
                </p>
                <Button onClick={() => setShowCreateDepartment(true)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Create Department
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <div className="grid gap-4">
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onAddMember={addTeamMember}
                onRemoveMember={removeTeamMember}
              />
            ))}

            {teams.length === 0 && (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No teams yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first team to start organizing your workforce.
                </p>
                <Button onClick={() => setShowCreateTeam(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Team Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.teamTypes || {}).map(([type, count]) => {
                    const typeInfo = TEAM_TYPES.find(t => t.value === type);
                    const percentage = stats ? (count / stats.totalTeams) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{typeInfo?.label || type}</div>
                          <div className="text-sm text-muted-foreground">{typeInfo?.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{count}</div>
                          <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Department Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.departmentDistribution.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dept.color }}
                        />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <Badge variant="outline">
                        {dept.teamsCount} {dept.teamsCount === 1 ? 'team' : 'teams'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Department Dialog */}
      <Dialog open={showCreateDepartment} onOpenChange={setShowCreateDepartment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Create a new department to organize your teams and resources.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateDepartment(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Department Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="code">Code (Optional)</Label>
                <Input id="code" name="code" placeholder="e.g., ENG, MKT" />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parent_department_id">Parent Department</Label>
                <Select name="parent_department_id">
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input id="budget" name="budget" type="number" step="0.01" />
              </div>
            </div>

            <div>
              <Label htmlFor="color">Department Color</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue="#3b82f6"
                  className="w-20 h-10"
                />
                <div className="flex flex-wrap gap-1">
                  {DEPARTMENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-6 h-6 rounded border-2 border-gray-300"
                      style={{ backgroundColor: color }}
                      onClick={(e) => {
                        const colorInput = document.getElementById('color') as HTMLInputElement;
                        if (colorInput) colorInput.value = color;
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDepartment(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Department</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team within a department.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateTeam(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input id="team-name" name="name" required />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  name="department_id"
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="team-description">Description</Label>
              <Textarea id="team-description" name="description" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team_type">Team Type</Label>
                <Select name="team_type" defaultValue="functional">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="max_members">Max Members</Label>
                <Input id="max_members" name="max_members" type="number" defaultValue="10" min="1" />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateTeam(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Team</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Department Card Component
function DepartmentCard({
  department,
  onEdit,
  onCreateTeam
}: {
  department: Department;
  onEdit: (dept: Department) => void;
  onCreateTeam: (deptId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: department.color }}
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg">{department.name}</CardTitle>
                {department.code && (
                  <Badge variant="outline">{department.code}</Badge>
                )}
              </div>
              {department.description && (
                <CardDescription className="mt-1">{department.description}</CardDescription>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <span>Level {department.department_level}</span>
                <span>{department.teams?.length || 0} teams</span>
                {department.budget && (
                  <span>${department.budget.toLocaleString()} budget</span>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onEdit(department)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Department
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateTeam(department.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Team
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Department
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {department.teams && department.teams.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-medium">Teams ({department.teams.length})</h4>
            <div className="grid gap-2">
              {department.teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{team.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {team.team_type}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {team.members_count || 0} / {team.max_members} members
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Team Card Component
function TeamCard({
  team,
  onAddMember,
  onRemoveMember
}: {
  team: Team;
  onAddMember: (teamId: string, userId: string) => Promise<any>;
  onRemoveMember: (teamId: string, userId: string) => Promise<boolean>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 border rounded-lg">
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <Badge variant="outline">{team.team_type.replace('_', ' ')}</Badge>
              </div>
              {team.description && (
                <CardDescription className="mt-1">{team.description}</CardDescription>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <span>{team.members_count || 0} / {team.max_members} members</span>
                {team.department && (
                  <span>Department: {team.department.name}</span>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Team Settings
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {team.memberships && team.memberships.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            <h4 className="font-medium">Team Members</h4>
            <div className="grid gap-2">
              {team.memberships.map((membership) => (
                <div key={membership.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={membership.user?.avatar_url} />
                      <AvatarFallback>
                        {membership.user?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{membership.user?.display_name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">
                        {membership.team_role} • {membership.assignment_percentage}% allocated
                      </div>
                    </div>
                  </div>
                  {membership.team_role === 'lead' && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
