'use client';

// The paper edit: the story told from the transcripts before anything is cut.
// Lines starred in a recording's transcript (Studio › Library) land here, in
// order across every recording; move them until the story reads, then copy or
// download it for the edit.

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Download, FileText, X } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { studio, useTranscriptLines, paperEdit, paperRuntime, paperEditText, moveSelect, formatStamp } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';
import t from '../media/transcript.module.css';

export function PaperEdit() {
  const { project, mediaById, goTo } = useStudio();
  const { toast } = useToast();
  const lines = useTranscriptLines(project.id);
  const selects = useMemo(() => paperEdit(lines.rows), [lines.rows]);
  const { ms, untimed } = paperRuntime(selects);
  const [saving, setSaving] = useState(false);
  const titleOf = (mediaId: string) => mediaById.get(mediaId)?.title || 'Untitled recording';

  const save = async (ids: string[]) => {
    setSaving(true);
    try {
      await studio.setPaperEdit(project.id, ids);
      for (const l of lines.rows) {
        const at = ids.indexOf(l.id);
        const want = at < 0 ? null : at;
        if (l.paper_order !== want) lines.upsertLocal({ ...l, paper_order: want });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save the paper edit', 'error');
    } finally {
      setSaving(false);
    }
  };
  const ids = selects.map((l) => l.id);

  const text = () => paperEditText(selects, titleOf);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text()); toast('Paper edit copied', 'success'); } catch { toast('Could not copy', 'error'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text()], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.title || 'project').replace(/[^\w-]+/g, '-')}-paper-edit.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (lines.status === 'loading') return <p className={s.hint}>Loading transcripts…</p>;
  if (selects.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={22} aria-hidden />}
        title="No paper edit yet"
        subtitle="Open an interview or recording in the Library, bring in its transcript, and star the lines that tell the story. They line up here, across every recording, for you to put in order."
        action={<button type="button" className={s.btnPrimary} onClick={() => goTo('library')}><FileText size={12} aria-hidden /> Open the Library</button>}
      />
    );
  }

  return (
    <section className={s.stack} aria-label="Paper edit">
      <div className={s.row} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span className={t.total} aria-live="polite">
          {selects.length} select{selects.length === 1 ? '' : 's'} · about {formatStamp(ms)}{untimed ? ` + ${untimed} untimed` : ''}{saving ? ' · saving…' : ''}
        </span>
        <div className={s.row}>
          <button type="button" className={cx(s.btn, s.small)} onClick={copy}><Copy size={11} aria-hidden /> Copy</button>
          <button type="button" className={cx(s.btn, s.small)} onClick={download}><Download size={11} aria-hidden /> Download .txt</button>
        </div>
      </div>
      <ol className={t.paper}>
        {selects.map((l, i) => (
          <li key={l.id} className={t.select}>
            <span className={t.num}>{i + 1}</span>
            <div>
              <p className={t.source}>
                {titleOf(l.media_id)} · {l.start_ms === null ? 'untimed' : `${formatStamp(l.start_ms)}${l.end_ms !== null ? `–${formatStamp(l.end_ms)}` : ''}`}
              </p>
              <p className={t.words}>{l.speaker && <span className={t.speaker}>{l.speaker}</span>}{l.text}</p>
            </div>
            <span className={t.acts}>
              <button type="button" className={s.iconBtn} disabled={i === 0 || saving} onClick={() => void save(moveSelect(ids, l.id, -1))} aria-label={`Move select ${i + 1} up`}><ArrowUp size={13} aria-hidden /></button>
              <button type="button" className={s.iconBtn} disabled={i === selects.length - 1 || saving} onClick={() => void save(moveSelect(ids, l.id, 1))} aria-label={`Move select ${i + 1} down`}><ArrowDown size={13} aria-hidden /></button>
              <button type="button" className={s.iconBtn} disabled={saving} onClick={() => void save(ids.filter((x) => x !== l.id))} aria-label={`Take select ${i + 1} out`}><X size={13} aria-hidden /></button>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
