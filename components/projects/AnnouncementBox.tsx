'use client';

import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ANNOUNCEMENT_MAX, postAnnouncement } from '@/lib/supabase/announcements';

/** The owner's "tell the team" box: it goes to the project's announcements channel and to each crew member's bell. */
export function AnnouncementBox({ projectId, projectTitle, userId }: { projectId: string; projectTitle: string; userId: string }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    try {
      const { notified } = await postAnnouncement({ projectId, projectTitle, userId, text });
      setText('');
      toast(notified ? `Posted, and ${notified} ${notified === 1 ? 'person' : 'people'} told.` : 'Posted to the announcements channel.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not post the announcement', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Announcement" style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 0 24px', maxWidth: 640 }}>
      <label htmlFor="announcement" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>
        <Megaphone size={14} aria-hidden /> Tell the team
      </label>
      <textarea
        id="announcement"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={ANNOUNCEMENT_MAX}
        rows={2}
        placeholder="Call moved to 6am. New location. Wrap party on Friday."
        style={{ width: '100%', resize: 'vertical', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14, fontFamily: 'inherit' }}
      />
      <div><Button onClick={post} disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post announcement'}</Button></div>
    </section>
  );
}
