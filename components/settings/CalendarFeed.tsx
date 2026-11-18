'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
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

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('calendar_feeds').select('token').eq('user_id', user.id).maybeSingle();
    if (error) { toast('Could not load your calendar link', 'error'); setToken(null); return; }
    setToken(data?.token ?? null);
  }, [user, toast]);
  useEffect(() => { void load(); }, [load]);

  const url = token ? `${typeof window === 'undefined' ? '' : window.location.origin}/api/calendar/${token}.ics` : '';
  const webcal = url.replace(/^https?:/, 'webcal:');

  const turnOn = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.from('calendar_feeds').insert({ user_id: user.id }).select('token').single();
    setBusy(false);
    if (error || !data) { toast('Could not make the link', 'error'); return; }
    setToken(data.token);
  };
  const replace = async () => {
    if (!user || !await confirm({ title: 'Replace the link?', message: 'Calendars using the old link stop updating until you add the new one.', confirmLabel: 'Replace' })) return;
    setBusy(true);
    const { data, error } = await supabase.from('calendar_feeds').update({ token: crypto.randomUUID() }).eq('user_id', user.id).select('token').single();
    setBusy(false);
    if (error || !data) { toast('Could not replace the link', 'error'); return; }
    setToken(data.token);
    toast('New link ready. Add it to your calendar again.', 'success');
  };
  const turnOff = async () => {
    if (!user || !await confirm({ title: 'Turn the calendar feed off?', message: 'The link stops working. You can make a new one any time.', confirmLabel: 'Turn off', danger: true })) return;
    setBusy(true);
    const { error } = await supabase.from('calendar_feeds').delete().eq('user_id', user.id);
    setBusy(false);
    if (error) { toast('Could not turn it off', 'error'); return; }
    setToken(null);
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
        <div><button type="button" style={btn} onClick={() => void turnOn()} disabled={busy}><CalendarPlus size={12} /> {busy ? 'MAKING…' : 'MAKE MY CALENDAR LINK'}</button></div>
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
