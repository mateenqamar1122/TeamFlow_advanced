import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  members: TeamMember[];
  due_date: string;
  tasks_completed: number;
  tasks_total: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
};

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  const fetchProjects = async () => {
    if (!user || !currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // @ts-ignore
        const { data, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const formattedProjects: Project[] = (data || []).map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress || 0,
        members: (project.members as TeamMember[]) || [],
        due_date: project.due_date,
        tasks_completed: project.tasks_completed || 0,
        tasks_total: project.tasks_total || 0,
        user_id: project.user_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
      }));

      setProjects(formattedProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Omit<Project, "id" | "created_at" | "updated_at">) => {
    if (!user || !currentWorkspace) {
      toast({
        title: "Error",
        description: "Please select a workspace first",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from("projects")
        .insert([
          {
            name: projectData.name,
            description: projectData.description,
            status: projectData.status,
            progress: projectData.progress,
            members: projectData.members,
            due_date: projectData.due_date,
            tasks_completed: projectData.tasks_completed,
            tasks_total: projectData.tasks_total,
            user_id: user.id,
            workspace_id: currentWorkspace.id,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Project created successfully",
      });
      await fetchProjects();
      return data;
    } catch (err) {
      console.error("Error creating project:", err);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          name: updates.name,
          description: updates.description,
          status: updates.status,
          progress: updates.progress,
          members: updates.members,
          due_date: updates.due_date,
          tasks_completed: updates.tasks_completed,
          tasks_total: updates.tasks_total,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      await fetchProjects();
      return true;
    } catch (err) {
      console.error("Error updating project:", err);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      await fetchProjects();
      return true;
    } catch (err) {
      console.error("Error deleting project:", err);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentWorkspace]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};
