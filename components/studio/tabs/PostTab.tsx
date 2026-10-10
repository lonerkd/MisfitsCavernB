'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, FileText, Film, ListChecks, Plus, Trash2, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { getProjectTeam } from '@/lib/supabase/crew-management';
import {
  studio, usePostItems, useSignedUrls, classifyUrl,
  POST_DEPARTMENTS, POST_DEPT_LABEL, POST_STATUSES, STANDARD_POST,
  type PostCut, type PostDepartment, type PostItem, type PostNote, type PostStatus,
} from '@/lib/studio';
import { formatTimecode, parseTimecode } from '@/lib/studio/timecode';
import { useStudio } from '../StudioContext';
import { CutPlayer, type CutPlayerHandle } from '../post/CutPlayer';
import { CutScript, type LinePick } from '../post/CutScript';
import { PaperEdit } from '../post/PaperEdit';
import { SectionHeader, ErrorBar, cx } from '../ui';
import s from '../studio.module.css';
import { useOnChange } from '@/lib/hooks/useOnChange';

type View = 'review' | 'paper' | 'pipeline';
const DEPT_LABEL = POST_DEPT_LABEL;
const STATUS_LABEL: Record<PostStatus, string> = { todo: 'To do', in_progress: 'In progress', review: 'In review', done: 'Done' };

/** People on the project: the owner and the crew (for assigning post work). */
function useProjectPeople(projectId: string, ownerId: string | undefined) {
  const [people, setPeople] = useState<Array<{ id: string; username: string }>>([]);
  useEffect(() => {
    let on = true;
    // The assignee list; without it, post work can still be added unassigned.
    getProjectTeam(projectId, ownerId).then(
      (team) => { if (on) setPeople(team.map((m) => ({ id: m.id, username: m.name }))); },
      (e) => console.error('Could not load the people on this project:', e),
    );
    return () => { on = false; };
  }, [projectId, ownerId]);
  return people;
}

/**
 * Post-production: review cuts with timecoded notes tied to scenes and
 * departments, and run the post pipeline and deliverables to delivery.
 */
export function PostTab() {
  const [view, setView] = useState<View>('review');
  // A link to a moment of a cut (?cut=&t=, e.g. from a note in the script's margin).
  const [deepLink] = useState(() => {
    if (typeof window === 'undefined') return null;
    const q = new URLSearchParams(window.location.search);
    const cut = q.get('cut');
    const t = Number(q.get('t'));
    return cut ? { cut, t: Number.isFinite(t) && t >= 0 ? t : null } : null;
  });
  return (
    <section aria-labelledby="post-title">
      <SectionHeader id="post-title" eyebrow="Post-production" title="Post" subtitle="Build the story from your transcripts, review each cut with timecoded notes, then take every department and deliverable to done." />
      <div className={s.chips} role="tablist" aria-label="Post views" style={{ marginBottom: 24 }}>
        <button type="button" role="tab" aria-selected={view === 'review'} className={cx(s.chip, view === 'review' && s.chipOn)} onClick={() => setView('review')}><Film size={12} /> Cut review</button>
        <button type="button" role="tab" aria-selected={view === 'paper'} className={cx(s.chip, view === 'paper' && s.chipOn)} onClick={() => setView('paper')}><FileText size={12} /> Paper edit</button>
        <button type="button" role="tab" aria-selected={view === 'pipeline'} className={cx(s.chip, view === 'pipeline' && s.chipOn)} onClick={() => setView('pipeline')}><ListChecks size={12} /> Pipeline & deliverables</button>
      </div>
      {view === 'review' ? <ReviewView deepLink={deepLink} /> : view === 'paper' ? <PaperEdit /> : <PipelineView />}
    </section>
  );
}

// ── Cut review ───────────────────────────────────────────────────────────────

function ReviewView({ deepLink }: { deepLink: { cut: string; t: number | null } | null }) {
  const { project, userId, isOwner, cuts, postNotes, media, mediaById, scenes, sceneLines } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [cutId, setCutId] = useState<string | null>(deepLink?.cut ?? null);
  const cut = cuts.rows.find((c) => c.id === cutId) ?? cuts.rows[0] ?? null;
  const player = useRef<CutPlayerHandle>(null);
  const [live, setLive] = useState(false);
  const onLive = useCallback((v: boolean) => setLive(v), []);
  // Seek to the linked moment once the player can take it.
  const pendingSeek = useRef(deepLink?.t ?? null);
  useEffect(() => {
    if (!live || pendingSeek.current == null || cut?.id !== deepLink?.cut) return;
    const t = pendingSeek.current;
    pendingSeek.current = null;
    window.setTimeout(() => player.current?.seek(t), 300);
  }, [live, cut?.id, deepLink?.cut]);

  // What the next note is about: the line picked in the script, else the scene shown.
  const [picked, setPicked] = useState<LinePick | null>(null);
  const [shownScene, setShownScene] = useState<string | null>(null);
  const onShown = useCallback((id: string | null) => setShownScene(id), []);
  useOnChange(cut?.id, () => setPicked(null));

  const videos = useMemo(() => media.rows.filter((m) => m.kind === 'video'), [media.rows]);
  const cutMedia = cut?.media_id ? mediaById.get(cut.media_id) : undefined;
  const signed = useSignedUrls([cutMedia?.storage_path]);

  // Add a cut
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const addCut = async () => {
    const t = title.trim() || `Cut ${cuts.rows.length + 1}`;
    const isMedia = source.startsWith('media:');
    if (!isMedia && !classifyUrl(source)) { toast('Paste a link to the cut (YouTube, Vimeo, Google Drive…) or pick a library video', 'error'); return; }
    try {
      const row = await studio.addCut(project.id, t, isMedia ? { media_id: source.slice(6) } : { url: source.trim() });
      cuts.upsertLocal(row); setCutId(row.id); setTitle(''); setSource('');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not add the cut', 'error'); }
  };
  const removeCut = async (c: PostCut) => {
    if (!await confirm({ title: 'Delete this cut?', message: `“${c.title}” and all of its notes will be deleted.`, confirmLabel: 'Delete' })) return;
    try { await studio.deleteCut(c.id); cuts.removeLocal(c.id); if (cutId === c.id) setCutId(null); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not delete the cut', 'error'); }
  };

  const notes = postNotes.rows.filter((n) => n.cut_id === cut?.id);

  return (
    <div className={s.postLayout}>
      <section className={s.panel} aria-label="Cuts">
        <div className={s.panelTitle}><Film size={14} /> Cuts · {cuts.rows.length}</div>
        {cuts.status === 'error' && <ErrorBar message={cuts.error ?? 'Could not load cuts'} onRetry={() => void cuts.reload()} />}
        <div className={s.stack} style={{ gap: 6 }}>
          {cuts.rows.map((c) => {
            const open = postNotes.rows.filter((n) => n.cut_id === c.id && !n.resolved_at).length;
            return (
              <div key={c.id} className={cx(s.cutRow, c.id === cut?.id && s.cutRowOn)}>
                <button type="button" className={s.cutPick} onClick={() => setCutId(c.id)} aria-pressed={c.id === cut?.id}>
                  <span className={s.cutTitle}>{c.title}</span>
                  <span className={s.hint}>{new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {open} open note{open === 1 ? '' : 's'}</span>
                </button>
                {(c.created_by === userId || isOwner) && (
                  <button type="button" className={s.refRemoveInline} onClick={() => void removeCut(c)} aria-label={`Delete cut ${c.title}`}><Trash2 size={12} /></button>
                )}
              </div>
            );
          })}
        </div>
        <div className={s.stack} style={{ gap: 6, marginTop: 14 }}>
          <label className={s.srOnly} htmlFor="cut-title">Cut name</label>
          <input id="cut-title" className={s.input} placeholder="Cut name — e.g. “Rough cut v2”" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          <label className={s.srOnly} htmlFor="cut-source">Cut link or library video</label>
          <input id="cut-source" className={s.input} placeholder="Link: YouTube, Vimeo, Google Drive…" value={source.startsWith('media:') ? '' : source} onChange={(e) => setSource(e.target.value)} disabled={source.startsWith('media:')} />
          {videos.length > 0 && (
            <select className={s.select} aria-label="Or a video from the library" value={source.startsWith('media:') ? source : ''} onChange={(e) => setSource(e.target.value)}>
              <option value="">…or a video from the library</option>
              {videos.map((v) => <option key={v.id} value={`media:${v.id}`}>{v.title || 'Untitled video'}</option>)}
            </select>
          )}
          <button type="button" className={cx(s.btnPrimary, s.small)} onClick={() => void addCut()} disabled={!source.trim()}><Plus size={11} /> Add cut</button>
        </div>
      </section>

      <div className={s.stack}>
        {!cut ? (
          <EmptyState icon={<Film size={26} />} title="No cuts yet" subtitle="Add the first cut — a private YouTube/Vimeo/Drive link or a video from the library — and the team can leave timecoded notes on it." />
        ) : (
          <>
            <div className={s.cutWithScript}>
              <div className={s.cutStage}>
                <CutPlayer ref={player} cut={cut} media={cutMedia} fileUrl={cutMedia?.storage_path ? signed[cutMedia.storage_path] : null} onLive={onLive} />
              </div>
              <CutScript scenes={scenes.rows} sceneLines={sceneLines} notes={notes} player={player} live={live}
                picked={picked} onPick={(p) => setPicked((cur) => (cur?.sceneId === p.sceneId && cur.offset === p.offset ? null : p))} onShown={onShown} />
            </div>
            <NoteComposer cutId={cut.id} live={live} player={player} scenes={scenes.rows} picked={picked} shownScene={shownScene} onAdded={() => setPicked(null)} onUnpick={() => setPicked(null)} />
            <NoteList notes={notes} player={player} />
          </>
        )}
      </div>
    </div>
  );
}

function NoteComposer({ cutId, live, player, scenes, picked, shownScene, onAdded, onUnpick }: {
  cutId: string; live: boolean; player: React.RefObject<CutPlayerHandle | null>;
  scenes: Array<{ id: string; scene_number: number; heading: string | null; title: string }>;
  picked: LinePick | null; shownScene: string | null; onAdded: () => void; onUnpick: () => void;
}) {
  const { project, postNotes } = useStudio();
  const { toast } = useToast();
  const [at, setAt] = useState('');
  const [dept, setDept] = useState<PostDepartment>('edit');
  const [loose, setLoose] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  // Untying applies to the scene it was untied from.
  useOnChange(shownScene, () => setLoose(false));
  useOnChange(picked, () => setLoose(false));
  const sceneId = picked?.sceneId ?? (loose ? null : shownScene);
  const scene = scenes.find((sc) => sc.id === sceneId);

  const now = () => { const t = player.current?.time(); if (t != null) setAt(formatTimecode(t)); };
  const add = async () => {
    const text = body.trim();
    if (!text) return;
    const fromPlayer = at.trim() ? null : player.current?.time();
    const seconds = at.trim() ? parseTimecode(at) : fromPlayer ?? null;
    if (seconds == null) { toast(live ? 'Enter a timecode like 1:23' : 'Enter a timecode like 1:23 (this player can’t report its position)', 'error'); return; }
    setBusy(true);
    try {
      postNotes.upsertLocal(await studio.addPostNote({
        project_id: project.id, cut_id: cutId, at_seconds: seconds, department: dept, body: text, scene_id: sceneId || null,
        line_offset: picked ? picked.offset : null, line_text: picked ? picked.text.slice(0, 1000) : null,
      }));
      setBody(''); setAt(''); onAdded();
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not add the note', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className={s.panel}>
      <div className={s.noteForm}>
        <div className={s.row} style={{ gap: 6 }}>
          <label className={s.srOnly} htmlFor="note-at">Timecode</label>
          <input id="note-at" className={cx(s.input, s.mono)} style={{ width: 92 }} placeholder={live ? 'now' : '0:00'} value={at} onChange={(e) => setAt(e.target.value)} />
          <button type="button" className={cx(s.btnGhost, s.small)} onClick={now} disabled={!live} title={live ? 'Use the player’s current position' : 'This player can’t report its position — type the timecode'}>Now</button>
        </div>
        <select className={s.select} aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value as PostDepartment)}>
          {POST_DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
        </select>
        <div className={s.noteTie} aria-live="polite">
          {picked && scene ? (
            <>
              <span className={s.hint}>On Sc {scene.scene_number} ·</span>
              <q className={s.noteLine}>{picked.text}</q>
              <button type="button" className={s.iconBtnPlain} onClick={onUnpick} aria-label="Unpin the line"><X size={12} /></button>
            </>
          ) : scene ? (
            <>
              <span className={s.hint}>About Sc {scene.scene_number} · {scene.heading ?? scene.title} — pick a line in the script to be exact</span>
              <button type="button" className={s.iconBtnPlain} onClick={() => setLoose(true)} aria-label="Not about this scene"><X size={12} /></button>
            </>
          ) : (
            <span className={s.hint}>Not tied to a scene</span>
          )}
        </div>
      </div>
      <div className={s.row} style={{ marginTop: 8, alignItems: 'stretch' }}>
        <label className={s.srOnly} htmlFor="note-body">Note</label>
        <textarea
          id="note-body" className={s.textarea} rows={2} maxLength={4000} style={{ flex: 1 }}
          placeholder={live ? 'Note at the current moment — Enter to add' : 'Note — Enter to add'}
          value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void add(); } }}
        />
        <button type="button" className={s.btnPrimary} onClick={() => void add()} disabled={busy || !body.trim()}><Plus size={12} /> Note</button>
      </div>
    </div>
  );
}

function NoteList({ notes, player }: { notes: PostNote[]; player: React.RefObject<CutPlayerHandle | null> }) {
  const { userId, isOwner, postNotes, scenes, openInScript } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const [dept, setDept] = useState<PostDepartment | ''>('');
  const sceneById = useMemo(() => new Map(scenes.rows.map((sc) => [sc.id, sc])), [scenes.rows]);
  const list = notes.filter((n) => (show === 'all' || !n.resolved_at) && (!dept || n.department === dept));
  const open = notes.filter((n) => !n.resolved_at).length;

  const toggle = async (n: PostNote) => {
    try { postNotes.upsertLocal(await studio.setPostNoteResolved(n.id, userId, !n.resolved_at)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not update the note', 'error'); }
  };
  const remove = async (n: PostNote) => {
    if (!await confirm('Delete this note?')) return;
    postNotes.removeLocal(n.id);
    try { await studio.deletePostNote(n.id); }
    catch (e) { postNotes.upsertLocal(n); toast(e instanceof Error ? e.message : 'Could not delete the note', 'error'); }
  };

  return (
    <div className={s.panel}>
      <div className={s.toolbar} style={{ marginBottom: 10 }}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>Notes · {open} open</div>
        <div className={s.actions}>
          <select className={s.select} aria-label="Filter by department" value={dept} onChange={(e) => setDept(e.target.value as PostDepartment | '')}>
            <option value="">All departments</option>
            {POST_DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
          </select>
          <div className={s.chips}>
            <button type="button" className={cx(s.chip, show === 'open' && s.chipOn)} onClick={() => setShow('open')}>Open</button>
            <button type="button" className={cx(s.chip, show === 'all' && s.chipOn)} onClick={() => setShow('all')}>All</button>
          </div>
        </div>
      </div>
      {list.length === 0 ? (
        <div className={s.hint}>{notes.length === 0 ? 'No notes on this cut yet.' : 'Nothing here — every note in this view is resolved.'}</div>
      ) : (
        <div className={s.stack} style={{ gap: 4 }}>
          {list.map((n) => {
            const sc = n.scene_id ? sceneById.get(n.scene_id) : undefined;
            return (
              <div key={n.id} className={cx(s.noteRow, n.resolved_at && s.noteDone)}>
                <button type="button" className={s.noteTime} onClick={() => player.current?.seek(Number(n.at_seconds))} title="Jump to this moment">{formatTimecode(Number(n.at_seconds))}</button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={s.noteMeta}>
                    <span className={cx(s.tag, s[`dept_${n.department}`])}>{DEPT_LABEL[n.department as PostDepartment] ?? n.department}</span>
                    {sc && <span className={s.hint}>Sc {sc.scene_number} · {sc.heading ?? sc.title}</span>}
                    {sc?.script_id && (
                      <button type="button" className={s.noteScript} onClick={() => openInScript(sc, n.id)}
                        aria-label={`Open ${n.line_text ? 'the line' : `scene ${sc.scene_number}`} in the script`}>
                        <FileText size={10} aria-hidden /> In script
                      </button>
                    )}
                  </div>
                  {n.line_text && <q className={s.noteLine}>{n.line_text}</q>}
                  <div className={s.noteBody}>{n.body}</div>
                </div>
                <button type="button" className={s.iconBtnPlain} onClick={() => void toggle(n)} aria-label={n.resolved_at ? 'Reopen note' : 'Resolve note'} title={n.resolved_at ? 'Reopen' : 'Resolve'}>
                  {n.resolved_at ? <CheckCircle2 size={15} color="var(--ok)" /> : <Circle size={15} />}
                </button>
                {(n.created_by === userId || isOwner) && (
                  <button type="button" className={s.refRemoveInline} onClick={() => void remove(n)} aria-label="Delete note"><Trash2 size={12} /></button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Pipeline & deliverables ──────────────────────────────────────────────────

function PipelineView() {
  const { project } = useStudio();
  const items = usePostItems(project.id);
  const people = useProjectPeople(project.id, project.creator_id);
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      const rows = await studio.addPostItems(project.id, STANDARD_POST.map((x, i) => ({ ...x, position: i })));
      rows.forEach((r) => items.upsertLocal(r));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not set up the pipeline', 'error'); }
    finally { setSeeding(false); }
  };

  if (items.status === 'error') return <ErrorBar message={items.error ?? 'Could not load the pipeline'} onRetry={() => void items.reload()} />;
  if (items.status === 'ready' && items.rows.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks size={26} />}
        title="No post pipeline yet"
        subtitle="Start from the standard stages (edit, sound, music, colour, VFX, titles) and deliverables (masters, stems, subtitles, cue sheet, trailer, key art, EPK, screener) — rename, add or remove anything."
        action={<button type="button" className={s.btnPrimary} onClick={() => void seed()} disabled={seeding}><Plus size={12} /> {seeding ? 'Setting up…' : 'Set up the standard pipeline'}</button>}
      />
    );
  }

  return (
    <div className={s.postCols}>
      <ItemList kind="stage" title="Pipeline" items={items} people={people} />
      <ItemList kind="deliverable" title="Deliverables" items={items} people={people} />
    </div>
  );
}

function ItemList({ kind, title, items, people }: { kind: 'stage' | 'deliverable'; title: string; items: ReturnType<typeof usePostItems>; people: Array<{ id: string; username: string }> }) {
  const { project } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState('');
  const list = items.rows.filter((i) => i.kind === kind);
  const done = list.filter((i) => i.status === 'done').length;
  const today = new Date().toISOString().slice(0, 10);

  const save = async (item: PostItem, patch: Partial<Pick<PostItem, 'status' | 'due_date' | 'assigned_to'>>) => {
    items.upsertLocal({ ...item, ...patch });
    try { items.upsertLocal(await studio.updatePostItem(item.id, patch)); }
    catch (e) { items.upsertLocal(item); toast(e instanceof Error ? e.message : 'Could not save', 'error'); }
  };
  const add = async () => {
    const t = draft.trim();
    if (!t) return;
    try {
      const [row] = await studio.addPostItems(project.id, [{ kind, title: t, position: list.reduce((m, i) => Math.max(m, i.position), -1) + 1 }]);
      items.upsertLocal(row); setDraft('');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not add', 'error'); }
  };
  const remove = async (item: PostItem) => {
    if (!await confirm(`Remove “${item.title}”?`)) return;
    items.removeLocal(item.id);
    try { await studio.deletePostItem(item.id); }
    catch (e) { items.upsertLocal(item); toast(e instanceof Error ? e.message : 'Could not remove', 'error'); }
  };

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}><ListChecks size={14} /> {title} · {done}/{list.length} done</div>
      <div className={s.progress} aria-hidden><div style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} /></div>
      <div className={s.stack} style={{ gap: 4, marginTop: 10 }}>
        {list.map((item) => (
          <div key={item.id} className={cx(s.itemRow, item.status === 'done' && s.noteDone)}>
            <select className={cx(s.select, s.itemStatus, s[`status_${item.status}`])} aria-label={`Status of ${item.title}`} value={item.status} onChange={(e) => void save(item, { status: e.target.value as PostStatus })}>
              {POST_STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
            </select>
            <span className={s.itemTitle}>{item.title}</span>
            <div className={s.itemMeta}>
            <input
              type="date" className={s.input} aria-label={`Due date for ${item.title}`} value={item.due_date ?? ''}
              style={{ color: item.status !== 'done' && item.due_date && item.due_date < today ? 'var(--danger)' : undefined }}
              onChange={(e) => void save(item, { due_date: e.target.value || null })}
            />
            <select className={s.select} aria-label={`Owner of ${item.title}`} value={item.assigned_to ?? ''} onChange={(e) => void save(item, { assigned_to: e.target.value || null })}>
              <option value="">No owner</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
            </div>
            <button type="button" className={s.refRemoveInline} onClick={() => void remove(item)} aria-label={`Remove ${item.title}`}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      <div className={s.row} style={{ marginTop: 10 }}>
        <label className={s.srOnly} htmlFor={`add-${kind}`}>Add to {title.toLowerCase()}</label>
        <input id={`add-${kind}`} className={s.input} style={{ flex: 1 }} placeholder={kind === 'stage' ? 'Add a stage…' : 'Add a deliverable…'} value={draft} maxLength={200}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
        <button aria-label="Add" type="button" className={cx(s.btn, s.small)} onClick={() => void add()} disabled={!draft.trim()}><Plus size={11} /></button>
      </div>
    </div>
  );
}
