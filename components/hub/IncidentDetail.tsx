'use client';

// An incident's state and running updates, under its post. Admins add updates
// and resolve (or reopen) it here; everyone else reads.

import { useState } from 'react';
import { useCurrentUser } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { addUpdate, listUpdates, setResolved, SEVERITY_LABEL } from '@/lib/hub/status';
import type { HubPost } from '@/lib/hub/posts';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

const stamp = (at: string) => new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function IncidentDetail({ post, onChange }: { post: HubPost; onChange: () => void }) {
  const { isAdmin } = useCurrentUser();
  const { toast } = useToast();
  const confirm = useConfirm();
  const updates = useLoad(`hub-updates:${post.id}`, () => listUpdates([post.id]));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const resolved = post.resolved_at !== null;

  const post_ = async () => {
    setBusy(true);
    const error = await addUpdate(post.id, text);
    setBusy(false);
    if (error) { toast(`Could not post the update: ${error}`, 'error'); return; }
    setText('');
    updates.reload();
  };

  const toggle = async () => {
    const ok = await confirm({
      title: resolved ? 'Reopen this incident?' : 'Mark this incident resolved?',
      message: resolved ? 'The banner comes back for everyone.' : 'The banner disappears for everyone. No notification is sent.',
      confirmLabel: resolved ? 'Reopen' : 'Resolve',
      danger: false,
    });
    if (!ok) return;
    const error = await setResolved(post.id, !resolved);
    if (error) { toast(`Could not ${resolved ? 'reopen' : 'resolve'} it: ${error}`, 'error'); return; }
    toast(resolved ? 'Reopened' : 'Resolved', 'success');
    onChange();
  };

  return (
    <section aria-label="Incident status" style={{ marginTop: 24, display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14 }}>
        <strong>{SEVERITY_LABEL[post.severity ?? 'minor']}</strong>
        {' · '}{resolved ? `Resolved ${stamp(post.resolved_at!)}` : 'Ongoing'}
      </p>
      {updates.error != null && <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the updates.</p>}
      {(updates.data ?? []).length > 0 && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10, borderLeft: '2px solid rgba(var(--ink-rgb), 0.12)' }}>
          {(updates.data ?? []).map((u) => (
            <li key={u.id} style={{ paddingLeft: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{stamp(u.created_at)}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{u.body}</div>
            </li>
          ))}
        </ol>
      )}
      {isAdmin && (
        <form onSubmit={(e) => { e.preventDefault(); void post_(); }} style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Post an update
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: 8, color: 'var(--fg-strong)' }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit" disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post update'}</Button>
            <Button type="button" variant="ghost" onClick={() => void toggle()}>{resolved ? 'Reopen' : 'Mark resolved'}</Button>
          </div>
        </form>
      )}
    </section>
  );
}
