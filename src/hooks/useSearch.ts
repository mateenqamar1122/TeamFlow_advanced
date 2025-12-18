import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';

export type SearchResultType = 'project' | 'task' | 'user' | 'comment';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  type: SearchResultType;
  url: string;
  metadata?: {
    status?: string;
    priority?: string;
    assignee?: string;
    created_at?: string;
    role?: string;
    email?: string;
    entity_type?: string;
    entity_id?: string;
    author?: string;
  };
}

export interface UseSearchOptions {
  limit?: number;
  types?: SearchResultType[];
}

export function useSearch(options: UseSearchOptions = {}) {
  const { limit = 50, types = ['project', 'task'] } = options;
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();

  const searchProjects = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!types.includes('project') || !currentWorkspace) return [];

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error in project query:', error);
        return [];
      }

      return (data || []).map((project: any) => ({
        id: project.id,
        title: project.name || 'Untitled Project',
        subtitle: `Project${project.status ? ` • ${project.status}` : ''}`,
        description: project.description || '',
        type: 'project' as SearchResultType,
        url: `/projects`,
        metadata: {
          status: project.status || 'Unknown',
          created_at: project.created_at
        }
      }));
    } catch (err) {
      console.error('Error searching projects:', err);
      return [];
    }
  }, [types, currentWorkspace]);

  const searchTasks = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!types.includes('task') || !currentWorkspace) return [];

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .ilike('title', `%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error in task query:', error);
        return [];
      }

      return (data || []).map((task: any) => ({
        id: task.id,
        title: task.title || 'Untitled Task',
        subtitle: `Task${task.status ? ` • ${task.status}` : ''}${task.priority ? ` • ${task.priority}` : ''}`,
        description: task.description || '',
        type: 'task' as SearchResultType,
        url: `/tasks`,
        metadata: {
          status: task.status || 'Unknown',
          priority: task.priority || 'Medium',
          created_at: task.created_at
        }
      }));
    } catch (err) {
      console.error('Error searching tasks:', err);
      return [];
    }
  }, [types, currentWorkspace]);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !user || !currentWorkspace) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchPromises = [
        searchProjects(query),
        searchTasks(query)
      ];

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Sort by relevance (exact matches first)
      const sortedResults = allResults.sort((a, b) => {
        const aExactMatch = a.title.toLowerCase().includes(query.toLowerCase());
        const bExactMatch = b.title.toLowerCase().includes(query.toLowerCase());

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        return 0;
      });

      setResults(sortedResults.slice(0, limit));
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace, limit, searchProjects, searchTasks]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults
  };
}
