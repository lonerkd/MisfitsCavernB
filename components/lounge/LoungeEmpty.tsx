'use client';

import Link from 'next/link';
import { BookOpen, Settings as SettingsIcon, X } from 'lucide-react';
import { RAIL_AREAS, paneEmpty } from '@/lib/lounge/rail';
import { useDeviceValue, writeDeviceValue } from '@/lib/hooks/useDeviceValue';
import type { Lounge } from '@/components/lounge/useLounge';

export const WELCOME_KEY = 'mc.lounge.welcome';

const mono = { fontFamily: 'var(--mono)', lineHeight: 1.7 } as const;
const button = { display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, padding: '7px 16px', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' } as const;

/** First visit only: where What's new and Learn are. Dismissed for good on this device (a convenience, never the only copy of anything). */
export function LoungeWelcome() {
  const seen = useDeviceValue(WELCOME_KEY);
  if (seen) return null;
  return (
    <aside className="mc-lounge-welcome" aria-label="Welcome to the Lounge"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px clamp(12px, 3vw, 24px)', background: 'var(--accent-dim)', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', flexShrink: 0 }}>
      <BookOpen size={16} aria-hidden color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ ...mono, fontSize: 12, color: 'var(--fg)', margin: 0, flex: 1, minWidth: 0 }}>
        <strong>New here?</strong> The Lounge is where your crew talks and drops into voice. <Link href="/hub" style={{ color: 'var(--fg-strong)', textDecoration: 'underline' }}>What’s new</Link> has the latest from The Cavern, and <Link href="/hub" style={{ color: 'var(--fg-strong)', textDecoration: 'underline' }}>Learn</Link> has guides for each craft.
      </p>
      <button type="button" onClick={() => writeDeviceValue(WELCOME_KEY, '1')} aria-label="Got it, hide this welcome"
        style={{ ...button, minHeight: 32, padding: '4px 10px', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.14)', color: 'var(--fg-muted)', flexShrink: 0 }}>
        Got it <X size={11} aria-hidden />
      </button>
    </aside>
  );
}

/** What the message pane says when it has no messages: each case teaches what the place is and offers a real next step. */
export function PaneEmptyState({ l }: { l: Lounge }) {
  const { activeChannel, dmTarget, messages, canPost, canManageActive, setShowManage } = l;
  const kind = paneEmpty({ messageCount: messages.length, hasDm: !!dmTarget, hasChannel: !!activeChannel, canPost, canManage: canManageActive });
  if (!kind) return null;
  if (kind === 'no-channel') {
    return (
      <div style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: 48, ...mono, fontSize: 12 }}>
        <p style={{ margin: 0, fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Pick a conversation</p>
        <p style={{ margin: '6px auto 18px', maxWidth: '44ch' }}>Everything is in the list: choose a channel or a person.</p>
        <dl style={{ margin: '0 auto', maxWidth: 420, textAlign: 'left', display: 'grid', gap: 10 }}>
          {RAIL_AREAS.map((a) => (
            <div key={a.id}>
              <dt style={{ color: 'var(--fg-strong)', fontWeight: 700 }}>{a.label}</dt>
              <dd style={{ margin: 0 }}>{a.purpose}</dd>
            </div>
          ))}
        </dl>
        <div style={{ marginTop: 20 }}>
          <Link href="/hub" style={{ ...button, background: 'var(--accent)', color: 'var(--on-accent)' }}><BookOpen size={13} aria-hidden /> Open Learn</Link>
        </div>
      </div>
    );
  }
  if (kind === 'dm') {
    return <div style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: 100, ...mono, fontSize: 12 }}>Nothing yet. Say hello to @{dmTarget!.name}; messages here are just between you two.</div>;
  }
  const name = activeChannel!.name;
  return (
    <div style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: 100, ...mono, fontSize: 12 }}>
      <p style={{ margin: 0, fontFamily: 'var(--ui)', fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>Nothing here yet. Say hello.</p>
      {kind === 'channel-readers' ? (
        <p style={{ margin: '8px auto 0', maxWidth: '44ch' }}>Only whoever runs #{name} posts here.</p>
      ) : (
        <p style={{ margin: '8px auto 0', maxWidth: '44ch' }}>Write below to start #{name}.</p>
      )}
      {kind === 'channel-managers' && (
        <>
          <p style={{ margin: '12px auto 0', maxWidth: '44ch' }}>
            {activeChannel!.topic ? <>Its topic: “{activeChannel!.topic}”. </> : null}
            You run this channel: pin a message (the pin beside it) to keep call times and decisions at the top, and set who may post.
          </p>
          <div style={{ marginTop: 14 }}>
            <button type="button" onClick={() => setShowManage(true)} style={{ ...button, background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.14)', color: 'var(--fg-strong)' }}>
              <SettingsIcon size={13} aria-hidden /> Manage #{name}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
