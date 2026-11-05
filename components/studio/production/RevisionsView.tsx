'use client';

import React, { useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import s from '../studio.module.css';

type RevisionEntry = { id: string; color: string; date: string; pages: string; notes: string; author: string };

const COLORS = ['White', 'Blue', 'Pink', 'Yellow', 'Green', 'Goldenrod', 'Buff', 'Salmon', 'Cherry'];

export function RevisionsView() {
  const { project } = useStudio();
  const items: RevisionEntry[] = useMemo(() => (project.settings as any)?.revisions ?? [], [project.settings]);
  const [draft, setDraft] = useState<Omit<RevisionEntry, 'id'>>({
    color: 'White',
    date: new Date().toISOString().slice(0, 10),
    pages: '',
    notes: '',
    author: '',
  });

  const save = async (next: RevisionEntry[]) => {
    await patchProjectSettings(project.id, { revisions: next } as any);
  };

  const add = async () => {
    if (!draft.pages.trim()) return;
    await save([...items, { ...draft, id: `rev-${Date.now()}` }]);
    setDraft({ color: 'White', date: new Date().toISOString().slice(0, 10), pages: '', notes: '', author: '' });
  };

  const remove = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={26} />}
        title="No script revisions"
        subtitle="Track colored-page revisions: White, Blue, Pink, Yellow…"
      />
    );
  }

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <FileText size={14} /> Script revisions
          <span className={s.hint}> · {items.length} revisions · latest: {sorted[sorted.length - 1]?.color}</span>
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Color</span>
            <select className={s.input} value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })}>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Date</span>
            <input type="date" className={s.input} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Pages</span>
            <input className={s.input} value={draft.pages} onChange={(e) => setDraft({ ...draft, pages: e.target.value })} placeholder="1-12, 15" />
          </label>
          <label className={s.field} style={{ flex: '0 0 140px' }}>
            <span className={s.label}>Author</span>
            <input className={s.input} value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} placeholder="Writer" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.pages.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes / changes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((r) => (
          <li key={r.id} className={s.panel} style={{ padding: 12, borderLeft: `4px solid ${r.color.toLowerCase()}` }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{r.color} pages</span>
              <span className={s.hint}>{r.date}</span>
              <span className={s.chip}>{r.pages}</span>
              {r.author && <span className={s.hint}>{r.author}</span>}
              <button className={s.btn} onClick={() => remove(r.id)} title="Delete" style={{ marginLeft: 'auto' }}>
                <Trash2 size={12} />
              </button>
            </div>
            {r.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
