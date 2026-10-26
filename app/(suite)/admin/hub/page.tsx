'use client';

// /admin/hub — write the hub's posts (public.hub_posts): drafts, publish and
// take back, pin, mark important (publishing an important post notifies every
// account, and so pushes to their phones). Only admins may write (RLS).

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import {
  listPosts, createPost, updatePost, setPublished, deletePost, checkPost, isPublished,
  HUB_AUDIENCES, HUB_KINDS, AUDIENCE_LABEL, KIND_LABEL, SEVERITIES, type HubPost, type HubPostInput, type Severity,
} from '@/lib/hub/posts';
import { HubMarkdown } from '@/components/hub/HubMarkdown';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { useFlag } from '@/components/Flag';
import { SEVERITY_LABEL } from '@/lib/hub/status';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14, width: '100%' };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' };
const EMPTY: HubPostInput = { kind: 'update', audience: 'everyone', title: '', body: '', cover_url: null, important: false, pinned: false };

const toInput = (p: HubPost): HubPostInput => ({ kind: p.kind, audience: p.audience, title: p.title, body: p.body, cover_url: p.cover_url, important: p.important, pinned: p.pinned, severity: p.severity });

export default function AdminHubPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const loaded = useLoad('admin-hub', listPosts);
  const posts = useMemo(() => loaded.data ?? [], [loaded.data]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<HubPostInput>(EMPTY);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const statusOn = useFlag('hub_status');

  const open = (p: HubPost | null) => {
    setEditing(p ? p.id : 'new');
    setDraft(p ? toInput(p) : EMPTY);
    setPreview(false);
  };

  const save = async () => {
    const checked = checkPost(draft);
    if (!checked.ok) { toast(checked.error, 'error'); return; }
    setBusy(true);
    if (editing === 'new') {
      const res = await createPost(checked.value);
      setBusy(false);
      if ('error' in res) { toast(`Could not save it: ${res.error}`, 'error'); return; }
      setEditing(res.id);
      toast('Draft saved', 'success');
    } else if (editing) {
      const error = await updatePost(editing, checked.value);
      setBusy(false);
      if (error) { toast(`Could not save it: ${error}`, 'error'); return; }
      toast('Saved', 'success');
    }
    loaded.reload();
  };

  const publish = async (p: HubPost, on: boolean) => {
    if (on && (p.important || p.kind === 'incident')) {
      const ok = await confirm({ title: `Publish “${p.title}”?`, message: p.kind === 'incident' ? 'An incident notifies everyone, shows the banner across the suite, and pushes to phones.' : 'It is marked important, so everyone gets a notification and a push.', confirmLabel: 'Publish and notify', danger: false });
      if (!ok) return;
    }
    if (!on) {
      const ok = await confirm({ title: `Take “${p.title}” back to draft?`, message: 'It disappears from the hub until you publish it again.', confirmLabel: 'Unpublish' });
      if (!ok) return;
    }
    const error = await setPublished(p.id, on);
    if (error) { toast(`Could not ${on ? 'publish' : 'unpublish'} it: ${error}`, 'error'); return; }
    toast(on ? 'Published' : 'Back to draft', 'success');
    loaded.reload();
  };

  const remove = async (p: HubPost) => {
    const ok = await confirm({ title: `Delete “${p.title}”?`, message: 'This removes it for everyone and can’t be undone.', confirmLabel: 'Delete' });
    if (!ok) return;
    const error = await deletePost(p.id);
    if (error) { toast(`Could not delete it: ${error}`, 'error'); return; }
    if (editing === p.id) setEditing(null);
    toast('Deleted', 'success');
    loaded.reload();
  };

  const current = editing && editing !== 'new' ? posts.find((p) => p.id === editing) ?? null : null;
  const state = loaded.error ? 'error' : loaded.loading && !loaded.data ? 'loading' : 'ready';

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 16px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Hub posts</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', maxWidth: '60ch' }}>What’s new and Learn, for everyone or one audience. Drafts are only visible to admins. Publishing a post marked important notifies every account.</p>
        <Button onClick={() => open(null)}><Plus size={14} aria-hidden /> New post</Button>

        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label={editing === 'new' ? 'New post' : 'Edit post'} style={{ display: 'grid', gap: 12, margin: '20px 0 32px', padding: 16, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)' }}>
            <label style={label}>Title
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} style={field} required />
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <label style={{ ...label, flex: '1 1 160px' }}>Section
                <select value={draft.kind} onChange={(e) => { const kind = e.target.value as HubPostInput['kind']; setDraft({ ...draft, kind, severity: kind === 'incident' ? draft.severity ?? 'minor' : null }); }} style={field}>
                  {HUB_KINDS.filter((k) => k !== 'incident' || statusOn || draft.kind === 'incident').map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </label>
              {draft.kind === 'incident' && (
                <label style={{ ...label, flex: '1 1 140px' }}>Severity
                  <select value={draft.severity ?? 'minor'} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Severity })} style={field}>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
                  </select>
                </label>
              )}
              <label style={{ ...label, flex: '1 1 160px' }}>Audience
                <select value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value as HubPostInput['audience'] })} style={field}>
                  {HUB_AUDIENCES.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
                </select>
              </label>
              <label style={{ ...label, flex: '2 1 240px' }}>Cover image (https link, optional)
                <input value={draft.cover_url ?? ''} onChange={(e) => setDraft({ ...draft, cover_url: e.target.value })} placeholder="https://…" style={field} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
              <button type="button" onClick={() => setPreview(false)} aria-pressed={!preview} style={{ background: 'none', border: 'none', color: preview ? 'var(--fg-muted)' : 'var(--fg-strong)', cursor: 'pointer', textDecoration: preview ? 'none' : 'underline' }}>Write</button>
              <button type="button" onClick={() => setPreview(true)} aria-pressed={preview} style={{ background: 'none', border: 'none', color: preview ? 'var(--fg-strong)' : 'var(--fg-muted)', cursor: 'pointer', textDecoration: preview ? 'underline' : 'none' }}>Preview</button>
            </div>
            {preview
              ? <div style={{ minHeight: 200, padding: 12, borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.08)' }}><HubMarkdown source={draft.body} /></div>
              : (
                <label style={label}>Body — markdown: # heading, **bold**, *italic*, - list, [link](https://…)
                  <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={14} maxLength={50000} style={{ ...field, fontFamily: 'var(--mono)', lineHeight: 1.5 }} />
                </label>
              )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} /> Pinned to the top</label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={draft.important} onChange={(e) => setDraft({ ...draft, important: e.target.checked })} /> Important — notify everyone when published</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing === 'new' ? 'Save draft' : 'Save'}</Button>
              {current && <Button type="button" variant="ghost" onClick={() => void publish(current, !isPublished(current))}>{isPublished(current) ? 'Unpublish' : 'Publish now'}</Button>}
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Close</Button>
            </div>
          </form>
        )}

        {state === 'loading' && <p style={{ color: 'var(--fg-muted)', marginTop: 20 }}>Loading…</p>}
        {state === 'error' && <p role="alert" style={{ color: 'var(--danger)', marginTop: 20 }}>Could not load the posts. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>}
        {state === 'ready' && posts.length === 0 && <p style={{ color: 'var(--fg-muted)', marginTop: 20 }}>No posts yet.</p>}
        {state === 'ready' && posts.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '20px 0 0', padding: 0, display: 'grid', gap: 8 }}>
            {posts.map((p) => (
              <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)' }}>
                <button type="button" onClick={() => open(p)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', color: 'var(--fg-strong)', cursor: 'pointer', fontSize: 15 }}>
                  {p.title}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)' }}>
                    {KIND_LABEL[p.kind]} · {AUDIENCE_LABEL[p.audience]} · {isPublished(p) ? `Published ${new Date(p.published_at!).toLocaleDateString()}` : p.published_at ? 'Scheduled' : 'Draft'}{p.pinned ? ' · Pinned' : ''}{p.important ? ' · Important' : ''}
                  </span>
                </button>
                <Button type="button" variant="ghost" onClick={() => void publish(p, !isPublished(p))}>{isPublished(p) ? 'Unpublish' : 'Publish'}</Button>
                <button type="button" aria-label={`Delete ${p.title}`} onClick={() => void remove(p)} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={15} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ProtectedPage>
  );
}
