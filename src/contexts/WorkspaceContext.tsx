import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkspaces, type Workspace, type WorkspaceMember, type WorkspacePermissions } from '@/hooks/useWorkspaces';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentMembership: WorkspaceMember | null;
  loading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (data: { name: string; slug: string; description?: string }) => Promise<string | null>;
  hasPermission: (resource: keyof WorkspacePermissions, action: string) => boolean;
  fetchWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaces();

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
}

// Alias for backward compatibility
export const useWorkspace = useWorkspaceContext;

