'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Pencil, Lock, Users, PenLine } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { supabase } from '@/lib/supabase/client';
import { NOTE_FOCUS_EVENT, noteFocusDone, noteFocusWanted } from '@/lib/notes/focus';
import { NOTE_SCOPES, addNote, deleteNote, editNote, listNotes, type Note, type NoteScope, type NoteTarget } from '@/lib/supabase/notes';

const ICON = { private: Lock, project: Users, writer: PenLine } as const;

interface Props extends NoteTarget {
  userId: string | null;
  /** Only the project's creator may delete other people's project notes. */
  isProjectOwner?: boolean;
  /** "Scene 12 · INT. KITCHEN - DAY": kept with the note so it still says what it was about. */
  context?: string | null;
  sceneId?: string | null;
}

/**
 * Notes in three layers. Private: only you. Project: the people on the project. Writers: the people who can open the script
 * (offered only where a script is in view). Project and writer notes tell the others; private ones never do.
 */
export function NotesPanel({ scriptId, projectId, userId, isProjectOwner, context, sceneId }: Props) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [scope, setScope] = useState<NoteScope>('private');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);

  const scopes: NoteScope[] = ['private', ...(projectId ? (['project'] as const) : []), ...(scriptId ? (['writer'] as const) : [])];
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let alive = true;
    listNotes({ scriptId, projectId })
      .then((n) => { if (alive) setNotes(n); })
      .catch((e) => { if (alive) { setNotes([]); toast(e instanceof Error ? e.message : 'Could not load notes', 'error'); } });
    return () => { alive = false; };
  }, [scriptId, projectId, tick, toast]);

  // Live: a teammate's note appears without a reload.
  useEffect(() => {
    if (!scriptId && !projectId) return;
    const ch = supabase.channel(`notes_${scriptId ?? projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [scriptId, projectId, load]);

  // The island's Note slot asks for the box.
  useEffect(() => {
    const focus = () => { if (box.current) { box.current.focus(); noteFocusDone(); } };
    if (noteFocusWanted()) focus();
    window.addEventListener(NOTE_FOCUS_EVENT, focus);
    return () => window.removeEventListener(NOTE_FOCUS_EVENT, focus);
  }, []);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addNote({ scope, body: draft, scriptId, projectId, context, sceneId });
      setDraft('');
      load();
      toast(scope === 'private' ? 'Note saved (only you can see it)' : 'Note added — the others are told', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the note', 'error'); }
    finally { setBusy(false); }
  };

  const saveEdit = async (id: string) => {
    try { await editNote(id, editText); setEditing(null); load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save the change', 'error'); }
  };

  const remove = async (n: Note) => {
    if (!(await confirm({ message: 'Delete this note?', confirmLabel: 'Delete' }))) return;
    try { await deleteNote(n.id); load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not delete the note', 'error'); }
  };

  const field = { width: '100%', background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 4, padding: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' as const };

  return (
    <section aria-label="Notes" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="group" aria-label="Who can read this note" style={{ display: 'flex', gap: 4 }}>
        {scopes.map((s) => {
          const Icon = ICON[s];
          return (
            <button key={s} type="button" aria-pressed={scope === s} title={NOTE_SCOPES[s].who} onClick={() => setScope(s)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px', fontSize: 12, borderRadius: 4, cursor: 'pointer',
                border: '1px solid rgba(var(--ink-rgb), 0.12)', background: scope === s ? 'var(--accent)' : 'transparent', color: scope === s ? 'var(--on-accent)' : 'var(--fg)' }}>
              <Icon size={12} aria-hidden /> {NOTE_SCOPES[s].label}
            </button>
          );
        })}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>{NOTE_SCOPES[scope].who} can read this{scope !== 'private' ? ', and they are told' : ''}.{context ? ` On ${context}.` : ''}</p>
      <textarea ref={box} aria-label="New note" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={4000} placeholder="Write a note…" style={field}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void add(); } }} />
      <button type="button" onClick={() => void add()} disabled={busy || !draft.trim()}
        style={{ alignSelf: 'flex-end', padding: '6px 14px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13, cursor: busy || !draft.trim() ? 'default' : 'pointer', opacity: busy || !draft.trim() ? 0.55 : 1 }}>
        {busy ? 'Saving…' : 'Add note'}
      </button>

      {notes === null ? <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Loading notes…</p>
        : notes.length === 0 ? <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>No notes yet.</p>
        : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map((n) => {
              const mine = n.created_by === userId;
              const Icon = ICON[n.scope];
              return (
                <li key={n.id} style={{ border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-muted)', marginBottom: 6 }}>
                    <Icon size={11} aria-hidden /> <span>{NOTE_SCOPES[n.scope].label}</span>
                    {n.context && <span>· {n.context}</span>}
                    <span style={{ marginLeft: 'auto' }}>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  {editing === n.id ? (
                    <>
                      <textarea aria-label="Edit note" value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={4000} style={field} />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                        <button type="button" onClick={() => setEditing(null)} style={{ fontSize: 12, background: 'transparent', color: 'var(--fg)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        <button type="button" onClick={() => void saveEdit(n.id)} style={{ fontSize: 12, background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>Save</button>
                      </div>
                    </>
                  ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.body}</p>}
                  {editing !== n.id && (mine || (n.scope === 'project' && isProjectOwner)) && (
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                      {mine && <button type="button" aria-label="Edit note" onClick={() => { setEditing(n.id); setEditText(n.body); }} style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><Pencil size={13} /></button>}
                      <button type="button" aria-label="Delete note" onClick={() => void remove(n)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}
