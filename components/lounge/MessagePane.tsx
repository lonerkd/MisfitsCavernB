'use client';

import { MessageBubble, GuideSections } from '@/components/lounge/MessageParts';
import type { Lounge } from '@/components/lounge/useLounge';

export function MessagePane({ l }: { l: Lounge }) {
  const { channels, activeChannel, dmTarget, replyCounts, setThreadParent, messages, currentUser, bottomRef, highlightId, openChannel, canPost, canManageActive, isGuide, handleDeleteGuideSection, handleReact, handleEdit, handlePin } = l;
  return (
    <div className="mc-lounge-thread" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto' }}>
        {isGuide ? (
          messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 11 }}>
              {canPost ? `WRITE THE FIRST SECTION OF ${activeChannel!.name.toUpperCase()} BELOW` : `${activeChannel!.name.toUpperCase()} IS BEING WRITTEN — CHECK BACK SOON`}
            </div>
          ) : (
            <GuideSections messages={messages} canEdit={canPost} onDelete={handleDeleteGuideSection} />
          )
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.7 }}>
            {dmTarget
              ? `Say hello to @${dmTarget.name} — messages here are just between you two.`
              : activeChannel
                ? `Nothing in #${activeChannel.name} yet. ${canPost ? 'Start it — write below.' : 'Only whoever runs it posts here.'}`
                : 'Choose a channel on the left.'}
            {!dmTarget && !activeChannel && (() => {
              const start = channels.find((c) => !c.project_id && c.name === 'start-here');
              return start ? (
                <div style={{ marginTop: 14 }}>
                  <button type="button" onClick={() => openChannel(start)}
                    style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', cursor: 'pointer', fontWeight: 600 }}>
                    Open #start-here
                  </button>
                </div>
              ) : null;
            })()}
          </div>
        ) : messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} onReact={handleReact} onOpenThread={dmTarget ? undefined : setThreadParent} replyCount={replyCounts[msg.id] || 0}
            canPin={dmTarget ? true : canManageActive} onPin={handlePin} onEdit={dmTarget || canPost ? handleEdit : undefined} highlight={highlightId === msg.id} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
