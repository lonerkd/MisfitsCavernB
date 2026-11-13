'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { REVISION_COLORS, loadRevisionsDB, type Revision } from '@/lib/scriptos/revisions';
import { useStudio } from '../StudioContext';
import { PrintButton } from '@/components/ui/PrintButton';
import { revisionsDoc } from '@/lib/studio/revisions-print';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

/**
 * The script's locked revisions, as the editor made them (Lock revision → `script_revisions`, the coloured pages and the
 * diff view). Read-only: a revision is locked in the editor, so this list can never disagree with the script.
 */
export function RevisionsView() {
  const { project, scripts, scriptId, scriptsStatus } = useStudio();
  const script = scripts.find((sc) => sc.id === scriptId) ?? null;
  const [got, setGot] = useState<{ scriptId: string; rows: Revision[] | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!scriptId) return;
    let live = true;
    loadRevisionsDB(scriptId)
      .then((rows) => { if (live) setGot({ scriptId, rows, error: null }); })
      .catch((e: unknown) => { if (live) setGot({ scriptId, rows: null, error: e instanceof Error ? e.message : 'Could not load the locked revisions' }); });
    return () => { live = false; };
  }, [scriptId]);

  if (scriptsStatus === 'loading') return <div className={s.stack}><p className={s.hint}>Loading…</p></div>;
  if (!script || !scriptId) {
    return <EmptyState icon={<FileText size={26} />} title="No script yet" subtitle="Revisions are locked from a script in the editor." />;
  }
  const mine = got?.scriptId === scriptId ? got : null;
  if (!mine) return <div className={s.stack}><p className={s.hint}>Loading revisions…</p></div>;
  if (mine.error) return <div className={s.stack}><p className={s.hint} role="alert">{mine.error}</p></div>;

  const rows = mine.rows ?? [];
  const editorHref = `/editor?script=${scriptId}`;
  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<FileText size={16} />} eyebrow="Story & planning" title="Script revisions" purpose="The script’s locked revisions and what changed." accent={project.accent_color} summary={<>{script.title} · {rows.length} locked</>} actions={<><div style={{ display: 'flex', gap: 8 }}>
          {rows.length > 0 && <PrintButton label="the revision history" build={() => revisionsDoc({
            project: project.title, accent: project.accent_color, script: script.title,
            revisions: rows.map((r) => ({ colour: REVISION_COLORS[r.colorIndex % REVISION_COLORS.length].name, label: r.label, date: r.date ? new Date(r.date).toLocaleDateString() : null })),
            generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
          })} />}
          <Link className={s.btn} href={editorHref}>Open in the editor</Link>
        </div></>} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText size={26} />}
          title="No locked revisions yet"
          subtitle="Lock a draft in the editor (Lock revision) and it appears here with its colour; the editor shows what changed page by page."
        />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...rows].reverse().map((r) => {
            const c = REVISION_COLORS[r.colorIndex % REVISION_COLORS.length];
            return (
              <li key={r.id} className={s.panel} style={{ padding: 12 }}>
                <div className={s.row} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={s.chip} style={{ background: c.bg, color: 'var(--fg-strong)', border: `1px solid ${c.color}` }}>{c.name}</span>
                  <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{r.label}</span>
                  <span className={s.hint}>{r.date ? new Date(r.date).toLocaleDateString() : ''}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
