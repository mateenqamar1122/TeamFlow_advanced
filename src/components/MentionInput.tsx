import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User } from 'lucide-react';
import { useMentions, MentionableUser } from '@/hooks/useMentions';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  onMention?: (mentionedUsers: MentionableUser[]) => void;
  workspaceId?: string;
}

interface MentionSuggestion {
  user: MentionableUser;
  startIndex: number;
  endIndex: number;
  query: string;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  placeholder = "Type @ to mention someone...",
  className,
  disabled = false,
  rows = 3,
  maxLength,
  onMention,
  workspaceId,
}) => {
  const { searchUsers, searchLoading, mentionableUsers } = useMentions({ workspaceId });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionableUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Extract current mention being typed
  const getCurrentMention = useCallback((text: string, cursorPos: number): MentionSuggestion | null => {
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);

    // Find the last @ symbol before cursor
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return null;

    // Check if there's text after @ (the query)
    const afterAt = beforeCursor.substring(lastAtIndex + 1);

    // Check if the mention is still being typed (no space after @)
    const spaceIndex = afterAt.indexOf(' ');
    if (spaceIndex !== -1) return null;

    // Find where the mention ends (space, newline, or end of string)
    const mentionEnd = afterCursor.search(/[\s\n]|$/);
    const endIndex = mentionEnd === -1 ? text.length : cursorPos + mentionEnd;

    return {
      user: { id: '', display_name: afterAt },
      startIndex: lastAtIndex,
      endIndex,
      query: afterAt.toLowerCase(),
    };
  }, []);

  // Search for users when typing @ mentions
  const handleTextChange = useCallback(async (newValue: string) => {
    onChange(newValue);

    const cursorPos = textareaRef.current?.selectionStart || newValue.length;
    const currentMention = getCurrentMention(newValue, cursorPos);

    if (currentMention && currentMention.query.length > 0) {
      setMentionStart(currentMention.startIndex);
      setMentionQuery(currentMention.query);

      // Search for users
      const users = await searchUsers(currentMention.query);
      setSuggestions(users);
      setShowSuggestions(users.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery('');
      setMentionStart(-1);
    }
  }, [onChange, getCurrentMention, searchUsers]);

  // Insert mention into text
  const insertMention = useCallback((user: MentionableUser) => {
    if (mentionStart === -1 || !textareaRef.current) return;

    const currentCursor = textareaRef.current.selectionStart || value.length;
    const currentMention = getCurrentMention(value, currentCursor);

    if (!currentMention) return;

    const mentionText = `@${user.display_name || user.username || user.id}`;
    const newValue =
      value.substring(0, currentMention.startIndex) +
      mentionText +
      ' ' +
      value.substring(currentMention.endIndex);

    onChange(newValue);

    // Set cursor position after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = currentMention.startIndex + mentionText.length + 1;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);

    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStart(-1);

    // Notify parent about the mention
    if (onMention) {
      onMention([user]);
    }
  }, [value, onChange, mentionStart, getCurrentMention, onMention]);

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedUser = suggestions[selectedIndex];
        if (selectedUser) {
          insertMention(selectedUser);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, insertMention]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSuggestions([]);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Render highlighted text with mentions
  const renderHighlightedText = useCallback((text: string) => {
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add highlighted mention
      parts.push(
        <span
          key={match.index}
          className="bg-blue-100 text-blue-800 px-1 rounded font-medium"
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  }, []);

  const getUserInitials = (user: MentionableUser): string => {
    const name = user.display_name || user.username || user.id;
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "resize-none min-h-[80px]",
            className
          )}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
        />

        {/* Character count */}
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto border shadow-lg"
        >
          <CardContent className="p-0">
            {searchLoading && (
              <div className="flex items-center justify-center p-3">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {!searchLoading && (
              <div className="py-1">
                {suggestions.map((user, index) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center px-3 py-2 cursor-pointer transition-colors",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    )}
                    onClick={() => insertMention(user)}
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.display_name || user.username}
                      />
                      <AvatarFallback className="text-xs">
                        {user.avatar_url ? null : <User className="h-3 w-3" />}
                        {!user.avatar_url && getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {user.display_name || user.username || user.id}
                        </span>
                        {user.role && (
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        )}
                      </div>
                      {user.display_name && user.username && (
                        <span className="text-xs text-muted-foreground">
                          @{user.username}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Helper text */}
      <div className="mt-1 text-xs text-muted-foreground">
        Type @ to mention team members
      </div>
    </div>
  );
};

export default MentionInput;
