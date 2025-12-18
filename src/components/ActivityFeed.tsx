import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  MessageCircle,
  ArrowRight,
  Tag,
  Users,
  Upload,
  AtSign,
  Heart,
  LogIn,
  LogOut,
  Filter,
  CalendarIcon,
  Search,
  RefreshCw,
  Clock,
  User,
  Loader2,
  // TagOff,
  UserX,
  FileX
} from 'lucide-react';
import { useActivityLogs, type ActivityFilters } from '@/hooks/useActivityLogs';
import { formatDistanceToNow, format } from 'date-fns';

const iconMap = {
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  MessageCircle,
  ArrowRight,
  Tag,
  // TagOff,
  Users,
  UserX,
  Upload,
  FileX,
  AtSign,
  Heart,
  LogIn,
  LogOut,
  Activity
};

interface ActivityFeedProps {
  limit?: number;
  showFilters?: boolean;
  showHeader?: boolean;
  height?: string;
}

export function ActivityFeed({
  limit = 20,
  showFilters = true,
  showHeader = true,
  height = "400px"
}: ActivityFeedProps) {
  const [filters, setFilters] = useState<ActivityFilters>({ limit });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const {
    activities,
    loading,
    error,
    refetch,
    getActivityIcon,
    getActivityColor
  } = useActivityLogs(filters);

  // Filter activities by search term
  const filteredActivities = activities.filter(activity => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      activity.entity_name?.toLowerCase().includes(searchLower) ||
      activity.description?.toLowerCase().includes(searchLower) ||
      activity.user_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleFilterChange = (key: keyof ActivityFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({ limit });
    setSearchTerm('');
    setDateRange({});
  };

  const getActivityDescription = (activity: any) => {
    if (activity.description) {
      return activity.description;
    }

    // Fallback descriptions
    const actionMap = {
      create: `Created ${activity.entity_type}`,
      update: `Updated ${activity.entity_type}`,
      delete: `Deleted ${activity.entity_type}`,
      assign: `Assigned ${activity.entity_type}`,
      unassign: `Unassigned ${activity.entity_type}`,
      comment: `Commented on ${activity.entity_type}`,
      status_change: `Changed ${activity.entity_type} status`,
      tag_add: `Added tag to ${activity.entity_type}`,
      tag_remove: `Removed tag from ${activity.entity_type}`,
      member_add: `Added member to ${activity.entity_type}`,
      member_remove: `Removed member from ${activity.entity_type}`,
    };

    return actionMap[activity.action_type as keyof typeof actionMap] ||
           `Performed ${activity.action_type} on ${activity.entity_type}`;
  };

  const getActivityMetadata = (activity: any) => {
    const metadata = activity.metadata || {};
    const details = [];

    if (metadata.from_status && metadata.to_status) {
      details.push(`${metadata.from_status} → ${metadata.to_status}`);
    }

    if (metadata.priority) {
      details.push(`Priority: ${metadata.priority}`);
    }

    if (metadata.assignee_id) {
      details.push('Assigned');
    }

    return details;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive">
            <Activity className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load activity feed</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-2">
                {/* Action Type Filter */}
                <Select
                  value={filters.action_types?.[0] || ''}
                  onValueChange={(value) =>
                    handleFilterChange('action_types', value ? [value] : undefined)
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Action type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="assign">Assign</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                    <SelectItem value="status_change">Status Change</SelectItem>
                  </SelectContent>
                </Select>

                {/* Entity Type Filter */}
                <Select
                  value={filters.entity_types?.[0] || ''}
                  onValueChange={(value) =>
                    handleFilterChange('entity_types', value ? [value] : undefined)
                  }
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="project">Projects</SelectItem>
                    <SelectItem value="comment">Comments</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                        ) : (
                          format(dateRange.from, 'MMM dd, yyyy')
                        )
                      ) : (
                        'Date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange as any}
                      onSelect={(range) => {
                        setDateRange(range || {});
                        handleFilterChange('date_from', range?.from);
                        handleFilterChange('date_to', range?.to);
                      }}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>

                {/* Clear Filters */}
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="p-0">
        <ScrollArea className={`${height} px-6`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {filteredActivities.map((activity, index) => {
                const IconComponent = iconMap[getActivityIcon(activity.action_type) as keyof typeof iconMap] || Activity;
                const metadata = getActivityMetadata(activity);

                return (
                  <div key={activity.id} className="relative">
                    {index < filteredActivities.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-px bg-border" />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Activity Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-background flex items-center justify-center ${getActivityColor(activity.action_type)}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Activity Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* User Avatar */}
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.user_avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {activity.user_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>

                          {/* User Name */}
                          <span className="font-medium text-sm">
                            {activity.user_name || 'Unknown User'}
                          </span>

                          {/* Timestamp */}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Activity Description */}
                        <p className="text-sm text-foreground mb-2">
                          {getActivityDescription(activity)}
                          {activity.entity_name && (
                            <span className="font-medium">
                              {' '}&quot;{activity.entity_name}&quot;
                            </span>
                          )}
                        </p>

                        {/* Metadata */}
                        {metadata.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {metadata.map((detail, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {detail}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ActivityFeed;
