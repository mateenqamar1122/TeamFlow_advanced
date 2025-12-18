import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

export interface Department {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description?: string;
  code?: string;
  color: string;
  parent_department_id?: string;
  department_level: number;
  head_of_department_id?: string;
  deputy_head_id?: string;
  budget?: number;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  head?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  deputy?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  teams?: Team[];
  children?: Department[];
  members_count?: number;
}

export interface Team {
  id: string;
  workspace_id: string;
  department_id: string;
  created_by: string;
  name: string;
  description?: string;
  team_type: 'functional' | 'project' | 'cross_functional' | 'temporary';
  team_lead_id?: string;
  scrum_master_id?: string;
  max_members: number;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  team_lead?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  scrum_master?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  department?: Department;
  memberships?: TeamMembership[];
  members_count?: number;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  workspace_id: string;
  team_role: 'lead' | 'senior' | 'member' | 'intern' | 'contractor';
  assigned_by?: string;
  assignment_percentage: number;
  is_active: boolean;
  joined_at: string;
  left_at?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  team?: Team;
}

export interface UserSkill {
  id: string;
  workspace_id: string;
  user_id: string;
  skill_name: string;
  skill_category: string;
  proficiency_level: number;
  verified_by?: string;
  verification_date?: string;
  years_experience: number;
  last_used?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  verifier?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface CreateDepartmentData {
  name: string;
  description?: string;
  code?: string;
  color?: string;
  parent_department_id?: string;
  head_of_department_id?: string;
  deputy_head_id?: string;
  budget?: number;
}

interface CreateTeamData {
  name: string;
  description?: string;
  department_id: string;
  team_type?: Team['team_type'];
  team_lead_id?: string;
  scrum_master_id?: string;
  max_members?: number;
}

interface CreateSkillData {
  skill_name: string;
  skill_category?: string;
  proficiency_level: number;
  years_experience?: number;
  last_used?: string;
  notes?: string;
}

export function useTeamManagement() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data: departmentsData, error: deptError } = await (supabase as any)
        .from('departments')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('department_level', { ascending: true })
        .order('name', { ascending: true });

      if (deptError) throw deptError;

      // Fetch teams for each department
      if (departmentsData && departmentsData.length > 0) {
        const departmentIds = departmentsData.map((d: any) => d.id);

        const { data: teamsData, error: teamsError } = await (supabase as any)
          .from('teams')
          .select('*')
          .in('department_id', departmentIds)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!teamsError && teamsData) {
          // Build hierarchical structure
          const departmentsWithTeams = departmentsData.map((dept: any) => ({
            ...dept,
            teams: teamsData.filter((team: any) => team.department_id === dept.id),
            children: departmentsData.filter((child: any) => child.parent_department_id === dept.id),
          }));

          setDepartments(departmentsWithTeams);
        }
      } else {
        setDepartments(departmentsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching departments:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch departments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Fetch teams
  const fetchTeams = useCallback(async (departmentId?: string) => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = (supabase as any)
        .from('teams')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data: teamsData, error: teamsError } = await query;

      if (teamsError) throw teamsError;

      // Fetch team memberships
      if (teamsData && teamsData.length > 0) {
        const teamIds = teamsData.map((t: any) => t.id);

        const { data: membershipsData, error: membershipsError } = await (supabase as any)
          .from('team_memberships')
          .select('*')
          .in('team_id', teamIds)
          .eq('is_active', true);

        if (!membershipsError && membershipsData) {
          const teamsWithMemberships = teamsData.map((team: any) => ({
            ...team,
            memberships: membershipsData.filter((m: any) => m.team_id === team.id),
            members_count: membershipsData.filter((m: any) => m.team_id === team.id).length,
          }));

          setTeams(teamsWithMemberships);
        }
      } else {
        setTeams(teamsData || []);
      }
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, toast]);

  // Create department
  const createDepartment = useCallback(async (departmentData: CreateDepartmentData) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('departments')
        .insert({
          ...departmentData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          color: departmentData.color || '#3b82f6',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchDepartments();
      toast({
        title: 'Department Created',
        description: 'Department has been created successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating department:', err);
      toast({
        title: 'Error',
        description: 'Failed to create department',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchDepartments, toast]);

  // Update department
  const updateDepartment = useCallback(async (departmentId: string, updates: Partial<CreateDepartmentData>) => {
    try {
      const { data, error } = await (supabase as any)
        .from('departments')
        .update(updates)
        .eq('id', departmentId)
        .select()
        .single();

      if (error) throw error;

      await fetchDepartments();
      toast({
        title: 'Department Updated',
        description: 'Department has been updated successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating department:', err);
      toast({
        title: 'Error',
        description: 'Failed to update department',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchDepartments, toast]);

  // Create team
  const createTeam = useCallback(async (teamData: CreateTeamData) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('teams')
        .insert({
          ...teamData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          team_type: teamData.team_type || 'functional',
          max_members: teamData.max_members || 10,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTeams();
      await fetchDepartments();
      toast({
        title: 'Team Created',
        description: 'Team has been created successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating team:', err);
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchTeams, fetchDepartments, toast]);

  // Add member to team
  const addTeamMember = useCallback(async (
    teamId: string,
    userId: string,
    teamRole: TeamMembership['team_role'] = 'member',
    assignmentPercentage: number = 100
  ) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('team_memberships')
        .insert({
          team_id: teamId,
          user_id: userId,
          workspace_id: currentWorkspace.id,
          team_role: teamRole,
          assigned_by: user.id,
          assignment_percentage: assignmentPercentage,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTeams();
      toast({
        title: 'Member Added',
        description: 'Team member has been added successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error adding team member:', err);
      toast({
        title: 'Error',
        description: 'Failed to add team member',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, user?.id, fetchTeams, toast]);

  // Remove member from team
  const removeTeamMember = useCallback(async (teamId: string, userId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('team_memberships')
        .update({
          is_active: false,
          left_at: new Date().toISOString()
        })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      await fetchTeams();
      toast({
        title: 'Member Removed',
        description: 'Team member has been removed successfully',
      });

      return true;
    } catch (err: any) {
      console.error('Error removing team member:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchTeams, toast]);

  // Create user skill
  const createUserSkill = useCallback(async (userId: string, skillData: CreateSkillData) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('user_skills')
        .insert({
          ...skillData,
          user_id: userId,
          workspace_id: currentWorkspace.id,
          skill_category: skillData.skill_category || 'technical',
          years_experience: skillData.years_experience || 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Skill Added',
        description: 'User skill has been added successfully',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating user skill:', err);
      toast({
        title: 'Error',
        description: 'Failed to add skill',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, toast]);

  // Get team statistics
  const getTeamStats = useCallback(() => {
    if (!departments.length && !teams.length) return null;

    const totalDepartments = departments.length;
    const totalTeams = departments.reduce((sum, dept) => sum + (dept.teams?.length || 0), 0);
    const totalMembers = teams.reduce((sum, team) => sum + (team.members_count || 0), 0);
    const avgTeamSize = totalTeams > 0 ? Math.round(totalMembers / totalTeams) : 0;

    const teamTypes = teams.reduce((acc, team) => {
      acc[team.team_type] = (acc[team.team_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDepartments,
      totalTeams,
      totalMembers,
      avgTeamSize,
      teamTypes,
      departmentDistribution: departments.map(dept => ({
        name: dept.name,
        teamsCount: dept.teams?.length || 0,
        color: dept.color,
      }))
    };
  }, [departments, teams]);

  // Auto-fetch data when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchDepartments();
      fetchTeams();
    }
  }, [currentWorkspace?.id, fetchDepartments, fetchTeams]);

  return {
    departments,
    teams,
    userSkills,
    loading,
    error,
    fetchDepartments,
    fetchTeams,
    createDepartment,
    updateDepartment,
    createTeam,
    addTeamMember,
    removeTeamMember,
    createUserSkill,
    getTeamStats,
  };
}
