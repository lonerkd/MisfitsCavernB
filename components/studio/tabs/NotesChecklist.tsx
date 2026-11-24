'use client';

import React, { useEffect, useState } from 'react';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { addTask, deleteTask, listTasks, updateTask, type TaskRow } from '@/lib/supabase/project-hub';
import s from '../studio.module.css';

/**
 * A checklist inside a Notes project: the project's own tasks (the same rows the project page lists), added, ticked and removed here.
 * Every change is saved to the database before it shows, and a failed save says so.
 */
export function NotesChecklist({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    listTasks(projectId)
      .then((rows) => { if (alive) setTasks(rows); })
      .catch((e) => { if (alive) { setTasks([]); toast(e instanceof Error ? e.message : 'Could not load the checklist', 'error'); } });
    return () => { alive = false; };
  }, [projectId, toast]);

  const add = async () => {
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const row = await addTask(projectId, title);
      setTasks((p) => [...(p ?? []), row]);
      setText('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add that', 'error');
    } finally { setBusy(false); }
  };
  const toggle = async (t: TaskRow) => {
    try {
      await updateTask(t.id, { completed: !t.completed });
      setTasks((p) => (p ?? []).map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save that', 'error'); }
  };
  const remove = async (t: TaskRow) => {
    if (!await confirm(`Delete “${t.title}”? This cannot be undone.`)) return;
    try {
      await deleteTask(t.id);
      setTasks((p) => (p ?? []).filter((x) => x.id !== t.id));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not delete that', 'error'); }
  };

  const done = (tasks ?? []).filter((t) => t.completed).length;
  return (
    <div className={s.panel} aria-labelledby="notes-checklist-title">
      <div className={s.panelTitle} id="notes-checklist-title"><CheckSquare size={14} /> Checklist{tasks && tasks.length ? ` · ${done} of ${tasks.length}` : ''}</div>
      <div className={s.stack} style={{ gap: 8 }}>
        {tasks === null ? <p className={s.hint}>Loading…</p> : tasks.length === 0 ? <p className={s.hint}>Nothing on the list yet.</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map((t) => (
              <li key={t.id} className={s.row} style={{ justifyContent: 'space-between', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flex: 1, minWidth: 0 }}>
                  <input type="checkbox" checked={t.completed} onChange={() => void toggle(t)} />
                  <span style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--fg-muted)' : 'var(--fg)' }}>{t.title}</span>
                </label>
                <button type="button" aria-label={`Delete ${t.title}`} onClick={() => void remove(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><Trash2 size={13} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
        <div className={s.row} style={{ gap: 8 }}>
          <input aria-label="New checklist item" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Add an item"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }}
            style={{ flex: 1, minWidth: 0, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 4, padding: '8px 10px', fontSize: 13 }} />
          <button type="button" onClick={() => void add()} disabled={busy || !text.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13, cursor: 'pointer' }}>
            <Plus size={13} aria-hidden /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
