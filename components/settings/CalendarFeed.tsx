'use client';

import React, { useEffect, useState } from 'react';
import { CalendarPlus, Copy, RefreshCw } from 'lucide-react';
import { createFeed, deleteFeed, getFeedToken, replaceFeedToken } from '@/lib/supabase/calendar';
import { useCurrentUser } from '@/lib/os';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

const mono: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)' };
const btn: React.CSSProperties = {
  ...mono, padding: '7px 12px', background: 'transparent', color: 'var(--fg-muted)', borderRadius: 8, cursor: 'pointer',
  border: '1px solid rgba(var(--ink-rgb), 0.12)', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
};
const hint: React.CSSProperties = { fontSize: 11, color: 'var(--fg-dim)', lineHeight: 1.5, margin: 0 };

/** The person's calendar subscription link: their shoot days, issued call sheets and assigned tasks in any calendar app. The link is the secret, so it can be replaced (the old one stops) or switched off. */
export function CalendarFeed() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getFeedToken(user.id).then(
      (tk) => { if (alive) setToken(tk); },
      (e: unknown) => { if (alive) { toast(e instanceof Error ? e.message : 'Could not load your calendar link', 'error'); setToken(null); } },
    );
    return () => { alive = false; };
  }, [user, toast]);

  const url = token ? `${typeof window === 'undefined' ? '' : window.location.origin}/api/calendar/${token}.ics` : '';
  const webcal = url.replace(/^https?:/, 'webcal:');

  const run = async (action: () => Promise<string | null>, done?: string) => {
    setBusy(true);
    try { setToken(await action()); if (done) toast(done, 'success'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Something went wrong', 'error'); }
    finally { setBusy(false); }
  };
  const turnOn = () => { if (user) void run(() => createFeed(user.id)); };
  const replace = async () => {
    if (!user || !await confirm({ title: 'Replace the link?', message: 'Calendars using the old link stop updating until you add the new one.', confirmLabel: 'Replace' })) return;
    await run(() => replaceFeedToken(user.id), 'New link ready. Add it to your calendar again.');
  };
  const turnOff = async () => {
    if (!user || !await confirm({ title: 'Turn the calendar feed off?', message: 'The link stops working. You can make a new one any time.', confirmLabel: 'Turn off', danger: true })) return;
    await run(async () => { await deleteFeed(user.id); return null; });
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied', 'success'); }
    catch { toast('Could not copy. Select the link and copy it.', 'error'); }
  };

  if (token === undefined) return <p style={hint}>Loading…</p>;
  if (token === null) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <p style={hint}>Your shoot days, issued call sheets (with your own call time) and the tasks assigned to you, in the calendar on your phone. Anyone with the link can read it, so keep it to yourself.</p>
        <div><button type="button" style={btn} onClick={turnOn} disabled={busy}><CalendarPlus size={12} /> {busy ? 'MAKING…' : 'MAKE MY CALENDAR LINK'}</button></div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p style={hint}>Add this link to Apple Calendar, Google Calendar or Outlook as a subscription. It updates itself. Anyone with the link can read it.</p>
      <input readOnly aria-label="Calendar link" value={url} onFocus={(e) => e.currentTarget.select()} style={{ ...mono, padding: '8px 10px', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)', color: 'var(--fg)', borderRadius: 8, width: '100%', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" style={btn} onClick={() => void copy()}><Copy size={12} /> COPY</button>
        <a style={btn} href={webcal}><CalendarPlus size={12} /> OPEN IN CALENDAR</a>
        <button type="button" style={btn} onClick={() => void replace()} disabled={busy}><RefreshCw size={12} /> NEW LINK</button>
        <button type="button" style={{ ...btn, color: 'var(--danger)' }} onClick={() => void turnOff()} disabled={busy}>TURN OFF</button>
      </div>
    </div>
  );
}
