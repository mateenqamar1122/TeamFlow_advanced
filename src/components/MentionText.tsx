import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { User } from 'lucide-react';
import { useMentions, MentionableUser } from '@/hooks/useMentions';
import { cn } from '@/lib/utils';

interface MentionTextProps {
  content: string;
  className?: string;
  workspaceId?: string;
  interactive?: boolean;
  onClick?: (username: string, user?: MentionableUser) => void;
}

interface ParsedContent {
  type: 'text' | 'mention';
  content: string;
  username?: string;
  user?: MentionableUser;
  key: string;
}

const MentionText: React.FC<MentionTextProps> = ({
  content,
  className,
  workspaceId,
  interactive = true,
  onClick,
}) => {
  const { mentionableUsers } = useMentions({ workspaceId });

  // Parse content to identify mentions and regular text
  const parsedContent = useMemo((): ParsedContent[] => {
    if (!content) return [];

    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const parts: ParsedContent[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index),
          key: `text-${lastIndex}-${match.index}`,
        });
      }

      // Find the mentioned user
      const username = match[1].toLowerCase();
      const mentionedUser = mentionableUsers.find(
        user =>
          user.display_name?.toLowerCase().replace(/\s+/g, '_') === username ||
          user.username?.toLowerCase() === username ||
          user.display_name?.toLowerCase() === username
      );

      // Add mention
      parts.push({
        type: 'mention',
        content: match[0],
        username,
        user: mentionedUser,
        key: `mention-${match.index}-${username}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex),
        key: `text-${lastIndex}-end`,
      });
    }

    return parts;
  }, [content, mentionableUsers]);

  const getUserInitials = (user: MentionableUser): string => {
    const name = user.display_name || user.username || user.id;
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderMention = (part: ParsedContent) => {
    const handleMentionClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (onClick && part.username) {
        onClick(part.username, part.user);
      }
    };

    // If user exists and interactive mode is enabled, show hover card
    if (part.user && interactive) {
      return (
        <HoverCard key={part.key}>
          <HoverCardTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium",
                "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200",
                "transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              )}
              onClick={handleMentionClick}
            >
              <Avatar className="h-4 w-4">
                <AvatarImage
                  src={part.user.avatar_url}
                  alt={part.user.display_name || part.username}
                />
                <AvatarFallback className="text-xs">
                  {part.user.avatar_url ? null : getUserInitials(part.user)}
                </AvatarFallback>
              </Avatar>
              <span>@{part.user.display_name || part.username}</span>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex items-start space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={part.user.avatar_url}
                  alt={part.user.display_name || part.username}
                />
                <AvatarFallback>
                  {part.user.avatar_url ? (
                    <User className="h-6 w-6" />
                  ) : (
                    getUserInitials(part.user)
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {part.user.display_name || part.username}
                </h4>
                {part.user.display_name && part.username && (
                  <p className="text-sm text-muted-foreground">
                    @{part.username}
                  </p>
                )}
                {part.user.role && (
                  <Badge variant="outline" className="text-xs">
                    {part.user.role}
                  </Badge>
                )}
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    // For unknown users or non-interactive mode, show simple mention
    const isValidUser = !!part.user;
    return (
      <span
        key={part.key}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium",
          isValidUser
            ? "bg-blue-50 text-blue-700 border border-blue-200"
            : "bg-gray-100 text-gray-600 border border-gray-200",
          interactive && onClick && "cursor-pointer hover:opacity-80"
        )}
        onClick={interactive && onClick ? handleMentionClick : undefined}
      >
        {isValidUser && part.user && (
          <Avatar className="h-4 w-4">
            <AvatarImage
              src={part.user.avatar_url}
              alt={part.user.display_name || part.username}
            />
            <AvatarFallback className="text-xs">
              {part.user.avatar_url ? null : getUserInitials(part.user)}
            </AvatarFallback>
          </Avatar>
        )}
        {!isValidUser && <User className="h-3 w-3" />}
        <span>{part.content}</span>
        {!isValidUser && (
          <span className="text-xs opacity-60" title="User not found">
            ?
          </span>
        )}
      </span>
    );
  };

  return (
    <div className={cn("break-words", className)}>
      {parsedContent.map((part) => {
        if (part.type === 'mention') {
          return renderMention(part);
        }

        return (
          <span key={part.key} className="whitespace-pre-wrap">
            {part.content}
          </span>
        );
      })}
    </div>
  );
};

export default MentionText;
