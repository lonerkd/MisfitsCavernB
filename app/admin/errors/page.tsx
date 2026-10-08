'use client';

// Admin › Errors: what broke for people, newest first, grouped by message and
// page, from the suite's own log (public.client_errors — the app reports every
// crash screen and uncaught error itself). Kept 30 days.

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Trash2 } from 'lucide-react';
import { clearClientErrors, listClientErrors } from '@/lib/supabase/client-errors';
import { ProtectedPage } from '@/lib/os';
import { useToast } from '@/components/Toast';
import { useLoad } from '@/lib/hooks/useLoad';
import { useConfirm } from '@/components/Confirm';
import type { Tables } from '@/lib/supabase/database.types';

type Row = Tables<'client_errors'>;
type Range = 1 | 7 | 30;
interface Group { key: string; message: string; path: string | null; kinds: Set<string>; count: number; users: Set<string>; last: string; first: string; sample: Row; ids: number[] }

const mono: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1 };

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export default function AdminErrorsPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [range, setRange] = useState<Range>(7);
  const { data, error: loadError, reload: load } = useLoad(String(range), async () => {
    const since = new Date(Date.now() - range * 86_400_000).toISOString();
    return listClientErrors(since);
  });
  const rows = data ?? null;
  const error = loadError ? (loadError as { message?: string }).message ?? 'Could not load errors' : null;

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of rows ?? []) {
      const key = `${r.message}|${r.path ?? ''}`;
      const g = map.get(key) ?? { key, message: r.message, path: r.path, kinds: new Set<string>(), count: 0, users: new Set<string>(), last: r.created_at, first: r.created_at, sample: r, ids: [] };
      g.count++; g.kinds.add(r.kind); g.ids.push(r.id); g.first = r.created_at;
      if (r.user_id) g.users.add(r.user_id);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  }, [rows]);

  const clear = async (g: Group) => {
    if (!(await confirm({ title: 'Clear this error?', message: `Removes its ${g.count} report${g.count === 1 ? '' : 's'} from the log — do it once it's fixed.`, confirmLabel: 'Clear' }))) return;
    try { await clearClientErrors(g.ids); }
    catch (e) { toast((e as { message?: string })?.message || 'Could not clear it', 'error'); return; }
    toast('Cleared', 'success');
    load();
  };

  return (
    <ProtectedPage require="admin">
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', paddingBottom: 'calc(var(--taskbar-height, 94px) + 24px)' }}>
        <header style={{ height: 60, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" aria-label="Back to admin" style={{ color: 'var(--fg)', display: 'flex' }}><ArrowLeft size={20} /></Link>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>ERRORS</h1>
        </header>

        <main style={{ maxWidth: 'var(--w-content)', margin: '0 auto', padding: '28px 24px' }}>
          <p style={{ ...mono, color: 'var(--fg-muted)', margin: '0 0 18px', lineHeight: 1.6, letterSpacing: 0.5 }}>
            Crashes and uncaught errors people hit, reported by the app itself. Grouped by message and page; kept 30 days.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <div role="group" aria-label="Period" style={{ display: 'flex', gap: 6 }}>
              {([1, 7, 30] as Range[]).map((d) => (
                <button key={d} type="button" aria-pressed={range === d} onClick={() => setRange(d)}
                  style={{ ...mono, minHeight: 36, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${range === d ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.12)'}`, background: range === d ? 'var(--accent-dim)' : 'transparent', color: range === d ? 'var(--fg)' : 'var(--fg-muted)' }}>
                  {d === 1 ? 'Last day' : `Last ${d} days`}
                </button>
              ))}
            </div>
            <button type="button" onClick={load} style={{ ...mono, minHeight: 36, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'transparent', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <RotateCw size={12} aria-hidden /> Refresh
            </button>
            {rows && <span style={{ ...mono, color: 'var(--fg-dim)', marginLeft: 'auto' }}>{rows.length} report{rows.length === 1 ? '' : 's'} · {groups.length} distinct</span>}
          </div>

          {error && <div role="alert" style={{ ...mono, color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}
          {rows === null && !error && <div style={{ ...mono, color: 'var(--fg-dim)' }} aria-busy="true">Loading…</div>}
          {rows && groups.length === 0 && (
            <div style={{ padding: 32, border: '1px dashed rgba(var(--ink-rgb), 0.12)', borderRadius: 14, textAlign: 'center', ...mono, color: 'var(--fg-muted)' }}>
              Nothing reported in this period.
            </div>
          )}

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Errors">
            {groups.map((g) => (
              <li key={g.key} style={{ border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 14, padding: '14px 16px', background: 'var(--sunken)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ ...mono, minWidth: 44, textAlign: 'center', padding: '4px 8px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.06)', color: 'var(--fg-strong)' }} aria-label={`${g.count} reports`}>×{g.count}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--fg-strong)', overflowWrap: 'anywhere' }}>{g.message}</div>
                    <div style={{ ...mono, color: 'var(--fg-dim)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{g.path ?? '—'}</span>
                      <span>{[...g.kinds].join(', ')}</span>
                      <span>{g.users.size} signed-in {g.users.size === 1 ? 'person' : 'people'}</span>
                      <span>last {ago(g.last)}</span>
                      {g.sample.release && <span>build {g.sample.release}</span>}
                    </div>
                    {(g.sample.stack || g.sample.digest || g.sample.user_agent) && (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ ...mono, color: 'var(--fg-muted)', cursor: 'pointer' }}>Details</summary>
                        {g.sample.digest && <div style={{ ...mono, marginTop: 6 }}>Digest: {g.sample.digest}</div>}
                        {g.sample.user_agent && <div style={{ ...mono, marginTop: 6, color: 'var(--fg-dim)' }}>{g.sample.user_agent}</div>}
                        {g.sample.stack && <pre style={{ marginTop: 8, padding: 12, borderRadius: 8, background: 'var(--bg)', fontSize: 11, lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre', color: 'var(--fg-muted)' }}>{g.sample.stack}</pre>}
                      </details>
                    )}
                  </div>
                  <button type="button" onClick={() => void clear(g)} aria-label={`Clear: ${g.message.slice(0, 60)}`} title="Clear once fixed"
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'transparent', color: 'var(--fg-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </ProtectedPage>
  );
}
