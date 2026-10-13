'use client';

// /admin/crafts — the suite's list of film crafts (public.crafts), which admins
// extend without a deploy. Everyone reads it (profiles, jobs, crew); only an
// admin may write it (RLS). A craft already used on a profile, a job or a crew
// row is stored there by name, so renaming is not offered — add a new one and
// retire the old one when nothing uses it.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { addCraft, removeCraft } from '@/lib/supabase/admin-crafts';
import { useLoad } from '@/lib/hooks/useLoad';
import { loadCrafts, byDepartment, type Craft } from '@/lib/crafts/crafts';
import { checkCraft } from '@/lib/crafts/validate';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14 };

export default function AdminCraftsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const loaded = useLoad('crafts', () => loadCrafts(true));
  const crafts: Craft[] = useMemo(() => loaded.data ?? [], [loaded.data]);
  const state = loaded.error ? 'error' : loaded.loading && !loaded.data ? 'loading' : 'ready';
  const [draft, setDraft] = useState({ name: '', department: '', color: '#e8431a', above_the_line: false });
  const [busy, setBusy] = useState(false);

  const reload = loaded.reload;

  const groups = useMemo(() => byDepartment(crafts), [crafts]);
  const departments = useMemo(() => groups.map((g) => g.department), [groups]);

  const add = async () => {
    const checked = checkCraft(draft, crafts.map((c) => c.name));
    if (!checked.ok) { toast(checked.error, 'error'); return; }
    setBusy(true);
    const position = (crafts.length ? Math.max(...crafts.map((c) => c.position)) : 0) + 1;
    const error = await addCraft(checked.value, position);
    setBusy(false);
    if (error) { toast(`Could not add it: ${error}`, 'error'); return; }
    setDraft({ name: '', department: draft.department, color: draft.color, above_the_line: false });
    toast(`Added ${checked.value.name}`, 'success');
    reload();
  };

  const remove = async (c: Craft) => {
    const ok = await confirm({ title: `Remove ${c.name}?`, message: 'People and jobs that already use it keep the name; it just stops being offered.', confirmLabel: 'Remove' });
    if (!ok) return;
    const error = await removeCraft(c.name);
    if (error) { toast(`Could not remove it: ${error}`, 'error'); return; }
    toast(`Removed ${c.name}`, 'success');
    reload();
  };

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 24px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Crafts</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 24px', maxWidth: '60ch' }}>The list people pick from on profiles, jobs and crew. {crafts.length ? `${crafts.length} crafts in ${groups.length} departments.` : ''}</p>

        <form onSubmit={(e) => { e.preventDefault(); void add(); }} aria-label="Add a craft" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 32 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Name
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={40} style={field} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Department
            <input value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} list="craft-departments" maxLength={40} style={field} />
            <datalist id="craft-departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Colour
            <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} aria-label="Colour" style={{ ...field, padding: 2, height: 38, width: 56 }} />
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 8 }}>
            <input type="checkbox" checked={draft.above_the_line} onChange={(e) => setDraft({ ...draft, above_the_line: e.target.checked })} /> Above the line
          </label>
          <Button type="submit" disabled={busy}><Plus size={14} aria-hidden /> {busy ? 'Adding…' : 'Add craft'}</Button>
        </form>

        {state === 'loading' && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
        {state === 'error' && <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the crafts. <button type="button" onClick={reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>}
        {state === 'ready' && groups.map((g) => (
          <section key={g.department} aria-label={g.department} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--fg-muted)' }}>{g.department}</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {g.crafts.map((c) => (
                <li key={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 6px 5px 10px', borderRadius: 9999, border: '1px solid rgba(var(--ink-rgb), 0.14)', fontSize: 13 }}>
                  <span aria-hidden style={{ width: 10, height: 10, borderRadius: 9999, background: c.color }} />
                  {c.name}
                  <button type="button" aria-label={`Remove ${c.name}`} onClick={() => void remove(c)} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 2 }}><Trash2 size={13} aria-hidden /></button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </ProtectedPage>
  );
}
