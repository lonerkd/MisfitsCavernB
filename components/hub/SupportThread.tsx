'use client';

// A support case's conversation and a reply box — the same for the person who
// opened it (/hub/help/[id]) and for admins (/admin/support). The database
// moves the case's status and notifies the other side on each message.

import { useState } from 'react';
import { useLoad } from '@/lib/hooks/useLoad';
import { listMessages, sendMessage, type SupportCase } from '@/lib/hub/support';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const stamp = (at: string) => new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function SupportThread({ kase, viewer, onChange }: { kase: SupportCase; viewer: 'person' | 'admin'; onChange: () => void }) {
  const { toast } = useToast();
  const messages = useLoad(`support-messages:${kase.id}`, () => listMessages(kase.id));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const error = await sendMessage(kase.id, text);
    setBusy(false);
    if (error) { toast(`Could not send it: ${error}`, 'error'); return; }
    setText('');
    messages.reload();
    onChange();
  };

  const who = (fromAdmin: boolean) => (fromAdmin ? (viewer === 'admin' ? 'Support (admin)' : 'Misfits Cavern support') : viewer === 'admin' ? 'Them' : 'You');

  return (
    <section aria-label="Conversation" style={{ display: 'grid', gap: 12 }}>
      {messages.error != null && (
        <p role="alert" style={{ color: 'var(--danger)' }}>
          Could not load the conversation. <button type="button" onClick={messages.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button>
        </p>
      )}
      {messages.loading && !messages.data && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {(messages.data ?? []).map((m) => (
          <li key={m.id} style={{ padding: 12, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: m.from_admin ? 'rgba(232, 67, 26, 0.06)' : 'var(--glass)' }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>{who(m.from_admin)} · {stamp(m.created_at)}</div>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--fg-strong)' }}>{m.body}</div>
          </li>
        ))}
      </ol>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
          {viewer === 'admin' ? 'Answer' : kase.status === 'resolved' ? 'Reply (this reopens the case)' : 'Reply'}
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} rows={4} style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: 8, color: 'var(--fg-strong)' }} />
        </label>
        <div><Button type="submit" disabled={busy || !text.trim()}>{busy ? 'Sending…' : 'Send'}</Button></div>
      </form>
    </section>
  );
}
