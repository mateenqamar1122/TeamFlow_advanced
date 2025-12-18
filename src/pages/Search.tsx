import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  FileText,
  CheckSquare,
  User,
  MessageCircle,
  Filter,
  SortAsc
} from 'lucide-react';
import { useSearch, SearchResultType } from '@/hooks/useSearch';
import { SearchResults } from '@/components/SearchResults';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState<SearchResultType | 'all'>('all');

  const searchOptions = {
    limit: 100,
    types: activeFilter === 'all'
      ? ['project', 'task', 'user', 'comment'] as SearchResultType[]
      : [activeFilter as SearchResultType]
  };

  const { results, loading, error, search } = useSearch(searchOptions);

  useEffect(() => {
    const queryParam = searchParams.get('q');
    if (queryParam) {
      setQuery(queryParam);
      search(queryParam);
    }
  }, [searchParams, search]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    if (newQuery.trim()) {
      setSearchParams({ q: newQuery });
      search(newQuery);
    } else {
      setSearchParams({});
    }
  };

  const handleFilterChange = (filter: SearchResultType | 'all') => {
    setActiveFilter(filter);
    if (query.trim()) {
      search(query);
    }
  };

  const getResultsByType = (type: SearchResultType) => {
    return results.filter(result => result.type === type);
  };

  const getFilterCount = (type: SearchResultType | 'all') => {
    if (type === 'all') return results.length;
    return getResultsByType(type as SearchResultType).length;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects, tasks, team members, comments..."
              className="pl-10"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Results */}
          {query.trim() && (
            <div>
              <Tabs value={activeFilter} onValueChange={handleFilterChange}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    All
                    {getFilterCount('all') > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {getFilterCount('all')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="project" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Projects
                    {getFilterCount('project') > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {getFilterCount('project')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="task" className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                    {getFilterCount('task') > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {getFilterCount('task')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="user" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    People
                    {getFilterCount('user') > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {getFilterCount('user')}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="comment" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Comments
                    {getFilterCount('comment') > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {getFilterCount('comment')}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <SearchResultsList
                    results={results}
                    loading={loading}
                    error={error}
                    query={query}
                    title="All Results"
                  />
                </TabsContent>
                <TabsContent value="project" className="mt-6">
                  <SearchResultsList
                    results={getResultsByType('project')}
                    loading={loading}
                    error={error}
                    query={query}
                    title="Projects"
                  />
                </TabsContent>
                <TabsContent value="task" className="mt-6">
                  <SearchResultsList
                    results={getResultsByType('task')}
                    loading={loading}
                    error={error}
                    query={query}
                    title="Tasks"
                  />
                </TabsContent>
                <TabsContent value="user" className="mt-6">
                  <SearchResultsList
                    results={getResultsByType('user')}
                    loading={loading}
                    error={error}
                    query={query}
                    title="Team Members"
                  />
                </TabsContent>
                <TabsContent value="comment" className="mt-6">
                  <SearchResultsList
                    results={getResultsByType('comment')}
                    loading={loading}
                    error={error}
                    query={query}
                    title="Comments"
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Empty State */}
          {!query.trim() && (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Search your workspace</h3>
              <p className="text-muted-foreground mb-4">
                Find projects, tasks, team members, and comments across your workspace
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Search by title, description, or content</p>
                <p>• Use filters to narrow down results</p>
                <p>• Click on results to navigate directly</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SearchResultsListProps {
  results: any[];
  loading: boolean;
  error: string | null;
  query: string;
  title: string;
}

function SearchResultsList({
  results,
  loading,
  error,
  query,
  title
}: SearchResultsListProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <Search className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No {title.toLowerCase()} found for "{query}"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline">{results.length} results</Badge>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <Card key={`${result.id}-${index}`} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {result.type === 'project' && <FileText className="h-4 w-4" />}
                  {result.type === 'task' && <CheckSquare className="h-4 w-4" />}
                  {result.type === 'user' && <User className="h-4 w-4" />}
                  {result.type === 'comment' && <MessageCircle className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        <a
                          href={result.url}
                          className="hover:text-primary transition-colors"
                        >
                          {result.title}
                        </a>
                      </h4>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {result.subtitle}
                        </p>
                      )}
                      {result.description && result.description !== result.title && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {result.metadata?.status && (
                        <Badge variant="outline" className="text-xs">
                          {result.metadata.status}
                        </Badge>
                      )}
                      {result.metadata?.priority && (
                        <Badge variant="outline" className="text-xs">
                          {result.metadata.priority}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {result.metadata?.created_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(result.metadata.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default SearchPage;
