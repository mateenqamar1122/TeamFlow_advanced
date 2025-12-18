import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { useActivityLogs, type ActivityLog } from '@/hooks/useActivityLogs';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Trash2, Loader2, X, Activity, User, MessageCircle, Edit, Plus, ArrowRight, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

const iconMap: { [key: string]: React.ElementType } = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  assign: User,
  unassign: User,
  comment: MessageCircle,
  status_change: ArrowRight,
  tag_add: Tag,
  tag_remove: Tag,
  default: Activity,
};

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  const iconMap = {
    task_assigned: '📝',
    task_completed: '✅',
    task_due: '⏰',
    project_update: '🔄',
    comment_mention: '💬',
    new_comment: '💬',
    file_uploaded: '📁',
    milestone_reached: '🏆',
    system_announcement: '📢',
  };
  return <span className="text-xl">{iconMap[type] || '🔔'}</span>;
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const getEntityLink = () => {
    if (!notification.entity_id || !notification.entity_type) return null;

    switch (notification.entity_type) {
      case 'task':
        return `/tasks/${notification.entity_id}`;
      case 'project':
        return `/projects/${notification.entity_id}`;
      default:
        return null;
    }
  };

  const entityLink = getEntityLink();

  return (
    <div className={`p-4 flex items-start gap-4 border-b ${!notification.is_read ? 'bg-primary/5' : ''}`}>
      <NotificationIcon type={notification.type} />
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{notification.title}</h4>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {entityLink && (
            <Button asChild variant="link" size="sm" className="p-0 h-auto">
              <Link to={entityLink}>View Details</Link>
            </Button>
          )}
          {!notification.is_read && (
            <Button variant="outline" size="sm" onClick={() => onMarkAsRead(notification.id)}>
              <Check className="h-3 w-3 mr-1" />
              Mark as Read
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onDelete(notification.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const ActivityLogItem = ({ activity }: { activity: ActivityLog }) => {
  const Icon = iconMap[activity.action_type] || iconMap.default;
  return (
    <div className="p-4 flex items-start gap-4 border-b">
      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
      <div className="flex-1">
        <p className="text-sm">
          <span className="font-medium">{activity.user_name || 'A user'}</span> {activity.description}
        </p>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
};

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch,
  } = useNotifications();
  const { activities, loading: activityLoading, error: activityError, refetch: refetchActivities } = useActivityLogs();

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || activityError) {
    return (
      <div className="text-center text-destructive">
        <p>Failed to load notifications or activities.</p>
        <Button onClick={() => { refetch(); refetchActivities(); }} className="mt-2">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Bell className="h-10 w-10 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground text-lg">
            You have {unreadCount} unread notifications.
          </p>
        </div>
        <Button onClick={markAllAsRead} disabled={unreadCount === 0}>
          <Check className="h-4 w-4 mr-2" />
          Mark All as Read
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="unread">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="unread">
                Unread <Badge className="ml-2">{unreadNotifications.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="read">
                Read <Badge variant="secondary" className="ml-2">{readNotifications.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity <Badge variant="secondary" className="ml-2">{activities.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unread">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {unreadNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4" />
                    <p>No unread notifications.</p>
                  </div>
                ) : (
                  unreadNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="read">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {readNotifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No read notifications.</p>
                  </div>
                ) : (
                  readNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {activityLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4" />
                    <p>No workspace activity found.</p>
                  </div>
                ) : (
                  activities.map(activity => (
                    <ActivityLogItem key={activity.id} activity={activity} />
                  ))
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
