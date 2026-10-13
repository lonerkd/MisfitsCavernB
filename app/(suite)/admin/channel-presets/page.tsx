'use client';

// /admin/channel-presets — the channels the Lounge suggests to a production at
// each phase (public.channel_presets). Admins add and remove them without a
// deploy; channels already made from a suggestion are not touched.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { addPreset, listPresets, removePreset, type PresetRow } from '@/lib/supabase/admin-presets';
import { checkPreset, PRESET_AUDIENCES, PRESET_PHASES, PRESET_POLICIES, PRESET_TYPES, type PresetInput } from '@/lib/lounge/presetCheck';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

type Row = PresetRow;

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14 };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' };
const EMPTY = { name: '', type: 'text', audience: 'team', post_policy: 'viewers', phase: 'pre-production', topic: '', why: '' } as const;

export default function AdminChannelPresetsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const loaded = useLoad('channel-presets', listPresets);
  const rows = useMemo(() => loaded.data ?? [], [loaded.data]);
  const [draft, setDraft] = useState<Omit<PresetInput, 'key'>>({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const byPhase = useMemo(() => PRESET_PHASES.map((phase) => ({ phase, rows: rows.filter((r) => r.phase === phase) })).filter((g) => g.rows.length), [rows]);

  const add = async () => {
    const checked = checkPreset(draft, rows.map((r) => r.key));
    if (!checked.ok) { toast(checked.error, 'error'); return; }
    setBusy(true);
    const error = await addPreset(checked.value, (rows.length ? Math.max(...rows.map((r) => r.position)) : 0) + 1);
    setBusy(false);
    if (error) { toast(`Could not add it: ${error}`, 'error'); return; }
    toast(`Added #${checked.value.key}`, 'success');
    setDraft({ ...EMPTY, phase: draft.phase });
    loaded.reload();
  };

  const remove = async (r: Row) => {
    if (!(await confirm({ title: `Remove #${r.key}?`, message: 'Channels already made from it stay. It just stops being suggested.', confirmLabel: 'Remove' }))) return;
    const error = await removePreset(r.key);
    if (error) { toast(`Could not remove it: ${error}`, 'error'); return; }
    toast(`Removed #${r.key}`, 'success');
    loaded.reload();
  };

  const select = (k: keyof typeof draft, options: readonly string[], text: string) => (
    <label style={label}>{text}
      <select value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value } as typeof draft)} style={field}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 24px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Channel suggestions</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 24px', maxWidth: '60ch' }}>The channels the Lounge offers a production as it moves through its phases.</p>

        <form onSubmit={(e) => { e.preventDefault(); void add(); }} aria-label="Add a suggestion" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 32 }}>
          <label style={label}>Name
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={40} style={field} />
          </label>
          {select('type', PRESET_TYPES, 'Type')}
          {select('audience', PRESET_AUDIENCES, 'Who sees it')}
          {select('post_policy', PRESET_POLICIES, 'Who posts')}
          {select('phase', PRESET_PHASES, 'Phase')}
          <label style={label}>Topic
            <input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} maxLength={200} style={{ ...field, minWidth: 220 }} />
          </label>
          <label style={label}>Why a production wants it
            <input value={draft.why} onChange={(e) => setDraft({ ...draft, why: e.target.value })} maxLength={200} style={{ ...field, minWidth: 220 }} />
          </label>
          <Button type="submit" disabled={busy}><Plus size={14} aria-hidden /> {busy ? 'Adding…' : 'Add suggestion'}</Button>
        </form>

        {loaded.error ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the suggestions. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>
        ) : loaded.loading && !loaded.data ? (
          <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>
        ) : byPhase.map((g) => (
          <section key={g.phase} aria-label={g.phase} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--fg-muted)', textTransform: 'capitalize' }}>{g.phase}</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {g.rows.map((r) => (
                <li key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}>#{r.key} <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>· {r.type} · {r.audience} · posts: {r.post_policy}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{r.why}</div>
                  </div>
                  <button type="button" aria-label={`Remove #${r.key}`} onClick={() => void remove(r)} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} aria-hidden /></button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </ProtectedPage>
  );
}
