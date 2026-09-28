'use client';

import React, { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useProject } from '@/lib/os';
import { logActivity } from '@/lib/supabase/activity';
import { createProjectBeat, deleteProjectBeat } from '@/lib/supabase/studio';
import { BeatCard } from '../CrewBoards';
import { CharacterBible } from '../CharacterBible';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

/** The story outline (beats) and the character bible. */
export function StoryView() {
  const { project, userId } = useStudio();
  const { refreshProject } = useProject();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const beats = project.beats ?? [];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await createProjectBeat({ project_id: project.id, title: title.trim(), content: content.trim(), created_by: userId, order_index: beats.length });
      logActivity(`added the beat "${title.trim()}"`, 'project', project.id);
      await refreshProject(project.id);
      setTitle(''); setContent(''); setAdding(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the beat', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: 'Delete this beat?', message: 'It will be removed for everyone on the project.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await deleteProjectBeat(id);
      await refreshProject(project.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', 'error');
    }
  };

  return (
    <div className={s.stack} style={{ gap: 32 }}>
      <div>
        <div className={s.toolbar}>
          <div className={s.panelTitle} style={{ marginBottom: 0 }}><BookOpen size={14} /> Beat board · {beats.length}</div>
          <button type="button" className={cx(s.btn, s.small)} aria-expanded={adding} onClick={() => setAdding((a) => !a)}><Plus size={11} /> New beat</button>
        </div>
        {adding && (
          <form onSubmit={add} className={s.panel} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className={s.srOnly} htmlFor="beat-title">Beat title</label>
            <input id="beat-title" autoFocus className={s.input} placeholder="Beat title — e.g. “The match goes out”" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
            <label className={s.srOnly} htmlFor="beat-content">What happens</label>
            <textarea id="beat-content" className={s.textarea} placeholder="What happens in this beat?" value={content} onChange={(e) => setContent(e.target.value)} />
            <div className={s.row}>
              <button type="submit" className={s.btnPrimary} disabled={busy || !title.trim()}>{busy ? 'Adding…' : 'Add beat'}</button>
              <button type="button" className={s.btnGhost} onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        )}
        {beats.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {beats.map((beat, i) => <BeatCard key={beat.id} beat={beat} index={i} onDelete={remove} />)}
          </div>
        ) : (
          <EmptyState icon={<BookOpen size={26} />} title="No beats yet" subtitle="Break the story into beats — they feed the pitch deck." />
        )}
      </div>
      <CharacterBible />
    </div>
  );
}
