// Quick test to verify InviteAccept import
import React from 'react';

// Test import - this should not cause any errors
const TestInviteAccept = React.lazy(() => import('./InviteAccept'));

export default function InviteAcceptTest() {
  return (
    <div>
      <h1>InviteAccept Import Test</h1>
      <React.Suspense fallback={<div>Loading...</div>}>
        <TestInviteAccept />
      </React.Suspense>
    </div>
  );
}
