import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCheck, Inbox, Archive } from 'lucide-react';
import MentionsNotification from '@/components/MentionsNotification';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useMentions } from '@/hooks/useMentions';

const MentionsPage: React.FC = () => {
  const { currentWorkspace } = useWorkspaceContext();
  const { mentions, unreadCount, markAllAsRead, loading } = useMentions({
    workspaceId: currentWorkspace?.id,
  });

  const unreadMentions = mentions.filter(m => !m.is_read);
  const readMentions = mentions.filter(m => m.is_read);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="h-8 w-8" />
            Mentions
          </h1>
          <p className="text-gray-600 mt-1">
            Stay updated with all your @mentions across the workspace
          </p>
        </div>

        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{mentions.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{unreadCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Read</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{readMentions.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentions Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All ({mentions.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Read ({readMentions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  Loading mentions...
                </div>
              </CardContent>
            </Card>
          ) : (
            <MentionsNotification
              workspaceId={currentWorkspace?.id}
              showTitle={false}
              maxHeight="none"
            />
          )}
        </TabsContent>

        <TabsContent value="unread" className="mt-6">
          {unreadMentions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCheck className="h-16 w-16 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-600">
                  You have no unread mentions. Great job staying on top of things!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {unreadMentions.map((mention) => (
                <Card key={mention.id} className="border-blue-200 bg-blue-50/30">
                  <CardContent className="p-4">
                    {/* Render individual mention - you could create a separate MentionItem component */}
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">
                            {mention.mentioner_user?.display_name || 'Someone'}
                          </span>
                          {' '}mentioned you in{' '}
                          <span className="font-medium">{mention.entity_type}</span>
                        </p>
                        {mention.content_excerpt && (
                          <p className="text-sm text-muted-foreground mt-1">
                            "{mention.content_excerpt}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(mention.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="read" className="mt-6">
          {readMentions.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Archive className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No read mentions
                </h3>
                <p className="text-gray-600">
                  Mentions you've already read will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {readMentions.map((mention) => (
                <Card key={mention.id} className="opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">
                            {mention.mentioner_user?.display_name || 'Someone'}
                          </span>
                          {' '}mentioned you in{' '}
                          <span className="font-medium">{mention.entity_type}</span>
                        </p>
                        {mention.content_excerpt && (
                          <p className="text-sm text-muted-foreground mt-1">
                            "{mention.content_excerpt}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(mention.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MentionsPage;
