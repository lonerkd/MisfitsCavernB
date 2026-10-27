'use client';

// /admin/formats — the kinds of project people can start (public.project_formats):
// a name, a line, an icon, the script format it opens, and which phases it
// skips. Admins add and remove them without a deploy; projects already made
// keep the format they were made with.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ProtectedPage } from '@/lib/os';
import { useLoad } from '@/lib/hooks/useLoad';
import { loadFormats } from '@/lib/formats/formats';
import { addFormat, removeFormat } from '@/lib/supabase/admin-formats';
import { checkFormat, FORMAT_ICONS, FORMAT_SCRIPTS, GATEABLE_PHASES, SKIPPABLE_PHASES, type FormatInput } from '@/lib/formats/check';
import { FormatIcon } from '@/components/formats/FormatPicker';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 14 };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--fg-muted)' };
const EMPTY: FormatInput = { name: '', blurb: '', icon: 'film', script_format: 'screenplay', skip_phases: [], approval_gates: [] };

export default function AdminFormatsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const loaded = useLoad('formats', () => loadFormats(true));
  const formats = useMemo(() => loaded.data ?? [], [loaded.data]);
  const [draft, setDraft] = useState<FormatInput>({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const checked = checkFormat(draft, formats.map((f) => f.name));
    if (!checked.ok) { toast(checked.error, 'error'); return; }
    setBusy(true);
    const error = await addFormat(checked.value, formats.length + 1);
    setBusy(false);
    if (error) { toast(`Could not add it: ${error}`, 'error'); return; }
    toast(`Added ${checked.value.name}`, 'success');
    setDraft({ ...EMPTY });
    loaded.reload();
  };

  const remove = async (name: string) => {
    if (!(await confirm({ title: `Remove ${name}?`, message: 'Projects already made keep it. It just stops being offered when someone starts a project.', confirmLabel: 'Remove' }))) return;
    const error = await removeFormat(name);
    if (error) { toast(`Could not remove it: ${error}`, 'error'); return; }
    toast(`Removed ${name}`, 'success');
    loaded.reload();
  };

  const toggleSkip = (p: (typeof SKIPPABLE_PHASES)[number]) =>
    setDraft({ ...draft, skip_phases: draft.skip_phases.includes(p) ? draft.skip_phases.filter((x) => x !== p) : [...draft.skip_phases, p] });

  const toggleGate = (p: (typeof GATEABLE_PHASES)[number]) => {
    const gates = draft.approval_gates ?? [];
    setDraft({ ...draft, approval_gates: gates.includes(p) ? gates.filter((x) => x !== p) : [...gates, p] });
  };

  return (
    <ProtectedPage require="admin">
      <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '24px 24px 96px', maxWidth: 'var(--w-content)', margin: '0 auto' }}>
        <Link href="/admin" aria-label="Back to admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', textDecoration: 'none', fontSize: 13 }}><ArrowLeft size={14} aria-hidden /> Admin</Link>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '12px 0 4px' }}>Project formats</h1>
        <p style={{ color: 'var(--fg-muted)', margin: '0 0 24px', maxWidth: '60ch' }}>The kinds of project people can start. A format sets the script it opens and which phases it skips.</p>

        <form onSubmit={(e) => { e.preventDefault(); void add(); }} aria-label="Add a format" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 32 }}>
          <label style={label}>Name
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={40} style={field} />
          </label>
          <label style={label}>One line
            <input value={draft.blurb} onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} maxLength={140} style={{ ...field, minWidth: 240 }} />
          </label>
          <label style={label}>Icon
            <select value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value as FormatInput['icon'] })} style={field}>{FORMAT_ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</select>
          </label>
          <label style={label}>Script format
            <select value={draft.script_format} onChange={(e) => setDraft({ ...draft, script_format: e.target.value as FormatInput['script_format'] })} style={field}>{FORMAT_SCRIPTS.map((i) => <option key={i} value={i}>{i}</option>)}</select>
          </label>
          <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
            <legend style={{ fontSize: 12, color: 'var(--fg-muted)', padding: 0, marginBottom: 4 }}>Skips</legend>
            {SKIPPABLE_PHASES.map((p) => (
              <label key={p} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><input type="checkbox" checked={draft.skip_phases.includes(p)} onChange={() => toggleSkip(p)} /> {p}</label>
            ))}
          </fieldset>
          <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
            <legend style={{ fontSize: 12, color: 'var(--fg-muted)', padding: 0, marginBottom: 4 }}>Client must approve before leaving</legend>
            {GATEABLE_PHASES.map((p) => (
              <label key={p} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><input type="checkbox" checked={(draft.approval_gates ?? []).includes(p)} onChange={() => toggleGate(p)} /> {p}</label>
            ))}
          </fieldset>
          <Button type="submit" disabled={busy}><Plus size={14} aria-hidden /> {busy ? 'Adding…' : 'Add format'}</Button>
        </form>

        {loaded.error ? (
          <p role="alert" style={{ color: 'var(--danger)' }}>Could not load the formats. <button type="button" onClick={loaded.reload} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>
        ) : loaded.loading && !loaded.data ? (
          <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>
        ) : (
          <ul aria-label="Formats" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {formats.map((f) => (
              <li key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 14 }}>
                <FormatIcon icon={f.icon} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>{f.name} <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>· {f.script_format}{f.rules.skip_phases.length ? ` · skips ${f.rules.skip_phases.join(', ')}` : ''}{f.rules.approval_gates?.length ? ` · client approves ${f.rules.approval_gates.join(', ')}` : ''}</span></div>
                  {f.blurb && <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{f.blurb}</div>}
                </div>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => void remove(f.name)} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </ProtectedPage>
  );
}
