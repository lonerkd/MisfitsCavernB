'use client';

import { MessageBubble } from '@/components/lounge/MessageParts';
import { PaneEmptyState } from '@/components/lounge/LoungeEmpty';
import type { Lounge } from '@/components/lounge/useLounge';

export function MessagePane({ l }: { l: Lounge }) {
  const { dmTarget, replyCounts, setThreadParent, messages, currentUser, bottomRef, highlightId, canPost, canManageActive, handleReact, handleEdit, handlePin } = l;
  return (
    <div className="mc-lounge-thread" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto' }}>
        {messages.length === 0 ? (
          <PaneEmptyState l={l} />
        ) : messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} onReact={handleReact} onOpenThread={dmTarget ? undefined : setThreadParent} replyCount={replyCounts[msg.id] || 0}
            canPin={dmTarget ? true : canManageActive} onPin={handlePin} onEdit={dmTarget || canPost ? handleEdit : undefined} highlight={highlightId === msg.id} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
