// Test file to verify all mention system imports work correctly
// This file helps identify any remaining import or compilation issues

// Core imports test
import React from 'react';

// Hook import test
import { useMentions } from '@/hooks/useMentions';

// Component imports test
import MentionInput from '@/components/MentionInput';
import MentionText from '@/components/MentionText';
import MentionsNotification from '@/components/MentionsNotification';

// Test functional component that uses all mention features
const MentionSystemTest: React.FC = () => {
  // Test hook usage
  const {
    mentions,
    mentionableUsers,
    loading,
    searchLoading,
    unreadCount,
    extractMentions,
    processMentions,
    searchUsers,
    markAsRead,
    markAllAsRead,
    deleteMention
  } = useMentions({ workspaceId: 'test-workspace-id' });

  const [content, setContent] = React.useState('');

  // Test component rendering
  return (
    <div className="mention-system-test p-4 space-y-4">
      <h2>Mention System Test - All Components</h2>

      {/* Test MentionInput component */}
      <div>
        <h3>MentionInput Test:</h3>
        <MentionInput
          value={content}
          onChange={setContent}
          placeholder="Type @ to test mentions..."
          workspaceId="test-workspace-id"
        />
      </div>

      {/* Test MentionText component */}
      <div>
        <h3>MentionText Test:</h3>
        <MentionText
          content="Hello @john and @sarah, please review this!"
          workspaceId="test-workspace-id"
          interactive={true}
        />
      </div>

      {/* Test MentionsNotification component */}
      <div>
        <h3>MentionsNotification Test:</h3>
        <MentionsNotification
          workspaceId="test-workspace-id"
          showTitle={true}
          maxHeight="300px"
        />
      </div>

      {/* Test hook data display */}
      <div>
        <h3>Hook Data Test:</h3>
        <ul>
          <li>Mentions: {mentions.length}</li>
          <li>Mentionable Users: {mentionableUsers.length}</li>
          <li>Unread Count: {unreadCount}</li>
          <li>Loading: {loading ? 'Yes' : 'No'}</li>
          <li>Search Loading: {searchLoading ? 'Yes' : 'No'}</li>
        </ul>
      </div>

      {/* Test function availability */}
      <div>
        <h3>Functions Available:</h3>
        <ul>
          <li>extractMentions: {typeof extractMentions === 'function' ? '✅' : '❌'}</li>
          <li>processMentions: {typeof processMentions === 'function' ? '✅' : '❌'}</li>
          <li>searchUsers: {typeof searchUsers === 'function' ? '✅' : '❌'}</li>
          <li>markAsRead: {typeof markAsRead === 'function' ? '✅' : '❌'}</li>
          <li>markAllAsRead: {typeof markAllAsRead === 'function' ? '✅' : '❌'}</li>
          <li>deleteMention: {typeof deleteMention === 'function' ? '✅' : '❌'}</li>
        </ul>
      </div>

      <p className="text-green-600 font-semibold">
        {loading ? 'Loading...' : '✅ All mention system components imported and rendered successfully!'}
      </p>
    </div>
  );
};

export default MentionSystemTest;
