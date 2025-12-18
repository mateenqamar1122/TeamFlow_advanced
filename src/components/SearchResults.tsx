import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  FileText,
  CheckSquare,
  User,
  MessageCircle,
  Calendar,
  Search as SearchIcon
} from 'lucide-react';
import { SearchResult, SearchResultType } from '@/hooks/useSearch';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  query: string;
  onResultClick?: () => void;
}

const getResultIcon = (type: SearchResultType) => {
  switch (type) {
    case 'project':
      return <FileText className="h-4 w-4" />;
    case 'task':
      return <CheckSquare className="h-4 w-4" />;
    case 'user':
      return <User className="h-4 w-4" />;
    case 'comment':
      return <MessageCircle className="h-4 w-4" />;
    default:
      return <SearchIcon className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in-progress':
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'todo':
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function SearchResults({ results, loading, error, query, onResultClick }: SearchResultsProps) {
  const navigate = useNavigate();

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onResultClick?.();
  };

  if (!query.trim()) {
    return null;
  }

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-hidden shadow-lg border-border/40">
      <CardContent className="p-0">
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <SearchIcon className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query.trim() && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <SearchIcon className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No results found</p>
                <p className="text-xs">Try searching for projects, tasks, or team members</p>
              </div>
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            <div className="p-2 text-xs font-medium text-muted-foreground border-b border-border/40">
              Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </div>

            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}-${index}`}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border/20 last:border-b-0 transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                  {getResultIcon(result.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {result.title}
                      </h4>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {result.subtitle}
                        </p>
                      )}
                      {result.description && result.description !== result.title && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {result.metadata?.status && (
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0.5 ${getStatusColor(result.metadata.status)}`}
                        >
                          {result.metadata.status}
                        </Badge>
                      )}
                      {result.metadata?.priority && (
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0.5 ${getStatusColor(result.metadata.priority)}`}
                        >
                          {result.metadata.priority}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {result.metadata?.created_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(result.metadata.created_at), { addSuffix: true })}
                    </p>
                  )}

                  {result.metadata?.assignee && (
                    <div className="flex items-center gap-1 mt-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {result.metadata.assignee}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="p-3 border-t border-border/40 bg-muted/20">
            <p className="text-xs text-muted-foreground text-center">
              Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border/40 rounded">Enter</kbd> to see all results
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
