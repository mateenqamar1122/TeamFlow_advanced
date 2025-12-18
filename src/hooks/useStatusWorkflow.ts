import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StatusWorkflow {
  id: string;
  name: string;
  description: string | null;
  entity_type: 'task' | 'project';
  statuses: StatusDefinition[];
  transitions: Record<string, string[]>;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface StatusDefinition {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface StatusHistoryEntry {
  id: string;
  entity_type: 'task' | 'project';
  entity_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export const useStatusWorkflows = () => {
  return useQuery({
    queryKey: ["status_workflows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_workflows")
        .select("*")
        .order("entity_type", { ascending: true });

      if (error) throw error;
      return data as StatusWorkflow[];
    },
  });
};

export const useStatusHistory = (entityType: 'task' | 'project', entityId: string) => {
  return useQuery({
    queryKey: ["status_history", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("status_history")
        .select(`
          *,
          profiles!status_history_changed_by_fkey(display_name, avatar_url)
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (StatusHistoryEntry & {
        profiles: { display_name: string | null; avatar_url: string | null } | null;
      })[];
    },
    enabled: !!entityId,
  });
};

export const useStatusWorkflowMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateEntityStatus = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      newStatus,
      reason,
    }: {
      entityType: 'task' | 'project';
      entityId: string;
      newStatus: string;
      reason?: string;
    }) => {
      const table = entityType === 'task' ? 'tasks' : 'projects';

      const { data, error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq("id", entityId)
        .select()
        .single();

      if (error) throw error;

      // The status history is automatically created by the database trigger
      // But we can optionally add a reason by inserting directly
      if (reason) {
        await supabase
          .from("status_history")
          .update({ reason })
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .eq("to_status", newStatus)
          .order("created_at", { ascending: false })
          .limit(1);
      }

      return data;
    },
    onSuccess: (_, { entityType, entityId }) => {
      queryClient.invalidateQueries({ queryKey: [entityType === 'task' ? 'tasks' : 'projects'] });
      queryClient.invalidateQueries({ queryKey: ["status_history", entityType, entityId] });
    },
  });

  const createStatusHistory = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      fromStatus,
      toStatus,
      reason,
    }: {
      entityType: 'task' | 'project';
      entityId: string;
      fromStatus: string | null;
      toStatus: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from("status_history")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          from_status: fromStatus,
          to_status: toStatus,
          changed_by: user?.id,
          reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { entityType, entityId }) => {
      queryClient.invalidateQueries({ queryKey: ["status_history", entityType, entityId] });
    },
  });

  return {
    updateEntityStatus,
    createStatusHistory,
  };
};

// Utility function to get valid transitions for a status
export const getValidTransitions = (
  workflow: StatusWorkflow | undefined,
  currentStatus: string
): string[] => {
  if (!workflow || !workflow.transitions) return [];
  return workflow.transitions[currentStatus] || [];
};

// Utility function to get status definition
export const getStatusDefinition = (
  workflow: StatusWorkflow | undefined,
  statusId: string
): StatusDefinition | undefined => {
  if (!workflow || !workflow.statuses) return undefined;
  return workflow.statuses.find(s => s.id === statusId);
};

// Utility function to validate status transition
export const isValidTransition = (
  workflow: StatusWorkflow | undefined,
  fromStatus: string,
  toStatus: string
): boolean => {
  const validTransitions = getValidTransitions(workflow, fromStatus);
  return validTransitions.includes(toStatus);
};
