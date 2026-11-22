'use client';

// Mood boards (Studio > Library): boards as objects of their own, each an arrangement of library items and note
// cards on a canvas. Everything here is saved: a board, its cards, where they sit, how big they are. Positions are
// percentages of the board, so it looks the same on any screen and prints the same.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { printHtmlString } from '@/lib/print/print';
import dynamic from 'next/dynamic';
import { ImagePlus, Link2, Palette, Printer, StickyNote, Trash2, ArrowUpToLine, LayoutGrid, Search, ChevronUp, ChevronDown, X, Presentation } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { pushUndo, undoOrigin } from '@/lib/os/undo';
import { useCanShape } from '@/lib/brief';
import {
  BOARD_TEMPLATES, SIZES, TEMPLATE_INFO, boardShareUrl, clampPoint, dominantColours, mediaSrc, studio, useMoodBoardItems, useMoodBoards, useSignedUrls,
  type BoardTemplate, type MoodBoard, type MoodBoardItem, type MoodBoardShare,
} from '@/lib/studio';
import { highlightSegments, matchCards, matchLabel, stepMatch } from '@/lib/studio/board-search';
import { toSlides } from '@/lib/studio/board-slides';
import { boardPrintHtml } from '@/lib/studio/boards-print';
import { useStudio } from '../StudioContext';
import { ErrorBar } from '../ui';
import { MediaThumbVisual } from '../media/MediaThumb';
import { MediaPicker } from '../media/MediaPicker';
import s from '../studio.module.css';
import b from './boards.module.css';

// The presenter is loaded when it is first opened, so the Studio's bundle does not carry it.
const BoardSlideshow = dynamic(() => import('@/components/boards/BoardSlideshow'), { ssr: false });

/** `text` with the words of the search marked. */
function Hl({ text, query }: { text: string; query: string }) {
  return <>{highlightSegments(text, query).map((p, n) => (p.hit ? <mark key={n} className={b.hit}>{p.text}</mark> : <React.Fragment key={n}>{p.text}</React.Fragment>))}</>;
}

const errMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

type Patch = Partial<Pick<MoodBoardItem, 'x' | 'y' | 'w' | 'z' | 'note'>>;

async function paletteOf(srcs: string[]): Promise<string[]> {
  const all: number[] = [];
  for (const src of srcs.slice(0, 6)) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((ok, no) => { img.onload = () => ok(); img.onerror = () => no(new Error('image')); img.src = src; });
      const c = document.createElement('canvas');
      c.width = 48; c.height = 48;
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, 48, 48);
      all.push(...ctx.getImageData(0, 0, 48, 48).data);
    } catch { /* an image that will not load adds nothing to the palette */ }
  }
  return dominantColours(all, 6);
}

export function BoardsPanel() {
  const { project, userId, media, isOwner } = useStudio();
  const canShape = useCanShape(project.id, isOwner);
  const { toast } = useToast();
  const confirm = useConfirm();
  const boards = useMoodBoards(project.id);
  const items = useMoodBoardItems(project.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [noting, setNoting] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState<BoardTemplate>('free');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [share, setShare] = useState<{ boardId: string; row: MoodBoardShare | null } | null>(null);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(-1);
  const [presenting, setPresenting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const active: MoodBoard | undefined = boards.rows.find((r) => r.id === activeId) ?? boards.rows[0];
  const boardItems = useMemo(() => items.rows.filter((i) => i.board_id === active?.id), [items.rows, active?.id]);
  const mediaById = useMemo(() => new Map(media.rows.map((m) => [m.id, m])), [media.rows]);
  const signed = useSignedUrls(boardItems.map((i) => { const m = i.media_id ? mediaById.get(i.media_id) : null; return m && (m.kind === 'image' || m.kind === 'video') ? m.storage_path : null; }));
  const srcOf = useCallback((i: MoodBoardItem) => { const m = i.media_id ? mediaById.get(i.media_id) : null; return m ? mediaSrc(m, signed) : null; }, [mediaById, signed]);

  // Search within the board: the cards that match, in reading order; the others are hidden while a search is on.
  const found = useMemo(() => matchCards(boardItems.map((i) => {
    const m = i.media_id ? mediaById.get(i.media_id) : undefined;
    return { id: i.id, x: i.x, y: i.y, note: i.note, media: m ? { title: m.title, kind: m.kind, notes: m.notes, board: m.board, external_url: m.external_url } : null };
  }), query), [boardItems, mediaById, query]);
  const matchIds = useMemo(() => found.matches.map((m) => m.id), [found.matches]);
  const matchById = useMemo(() => new Map(found.matches.map((m) => [m.id, m])), [found.matches]);
  const goMatch = (dir: 1 | -1) => {
    const next = stepMatch(current, matchIds.length, dir);
    setCurrent(next);
    const el = next >= 0 ? canvasRef.current?.querySelector<HTMLElement>(`[data-card-id="${matchIds[next]}"]`) : null;
    if (el) {
      el.scrollIntoView?.({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      el.focus({ preventScroll: true });
    }
  };
  const changeQuery = (v: string) => { setQuery(v); setCurrent(-1); };
  const slides = useMemo(() => toSlides(boardItems.map((i) => {
    const m = i.media_id ? mediaById.get(i.media_id) : undefined;
    return { id: i.id, x: i.x, y: i.y, note: i.note, media: m ? { kind: m.kind, title: m.title, notes: m.notes, external_url: m.external_url } : null, src: srcOf(i) };
  })), [boardItems, mediaById, srcOf]);

  // The link belongs to people who shape the project: it is read only when the panel is opened.
  const shareBoardId = canShape && shareOpen ? active?.id ?? null : null;
  useEffect(() => {
    if (!shareBoardId) return;
    let alive = true;
    studio.getBoardShare(shareBoardId).then((row) => { if (alive) setShare({ boardId: shareBoardId, row }); }, (e) => { if (alive) toast(errMessage(e, 'Could not read the board link'), 'error'); });
    return () => { alive = false; };
  }, [shareBoardId, toast]);
  const currentShare = share && share.boardId === active?.id ? share.row : undefined;

  const [palette, setPalette] = useState<{ key: string; colours: string[] } | null>(null);
  const imageSrcs = useMemo(() => boardItems.filter((i) => i.media_id && mediaById.get(i.media_id)?.kind === 'image').map(srcOf).filter((x): x is string => !!x), [boardItems, mediaById, srcOf]);
  const paletteKey = imageSrcs.join('|');
  useEffect(() => {
    if (!paletteKey) return;
    let alive = true;
    void paletteOf(paletteKey.split('|')).then((colours) => { if (alive) setPalette({ key: paletteKey, colours }); });
    return () => { alive = false; };
  }, [paletteKey]);
  const colours = palette?.key === paletteKey ? palette.colours : [];

  const run = async <T,>(what: () => Promise<T>, fallback: string): Promise<T | null> => {
    try { return await what(); } catch (e) { toast(errMessage(e, fallback), 'error'); return null; }
  };

  const createBoard = async () => {
    const made = await run(() => studio.createMoodBoard(project.id, userId, newName, newTemplate), 'Could not make the board');
    if (!made) return;
    boards.upsertLocal(made.board);
    made.items.forEach((i) => items.upsertLocal(i));
    setActiveId(made.board.id);
    setNewName('');
    setNewTemplate('free');
  };

  const removeBoard = async (board: MoodBoard) => {
    if (!(await confirm(`Delete "${board.name}" and everything on it? The library items stay.`))) return;
    if (await run(() => studio.deleteMoodBoard(board.id).then(() => true), 'Could not delete the board')) {
      boards.removeLocal(board.id);
      boardItems.forEach((i) => items.removeLocal(i.id));
      setActiveId(null);
    }
  };

  const rename = async (board: MoodBoard, name: string) => {
    setRenaming(null);
    if (!name.trim() || name.trim() === board.name) return;
    const row = await run(() => studio.renameMoodBoard(board.id, name), 'Could not rename the board');
    if (row) boards.upsertLocal(row);
  };

  const addMedia = async (ids: string[]) => {
    if (!active) return;
    const rows = await studio.addBoardMedia(active, userId, ids, boardItems);
    rows.forEach((r) => items.upsertLocal(r));
  };

  const addNote = async () => {
    if (!active) return;
    const row = await run(() => studio.addBoardNote(active, userId, noteText, boardItems), 'Could not add the note');
    if (row) { items.upsertLocal(row); setNoteText(''); setNoting(false); setSelectedId(row.id); }
  };

  const save = async (item: MoodBoardItem, patch: Patch, undoLabel?: string) => {
    const origin = undoOrigin();
    const before: Patch = { x: item.x, y: item.y, w: item.w, z: item.z, note: item.note };
    items.upsertLocal({ ...item, ...patch });
    const row = await run(() => studio.updateBoardItem(item.id, patch), 'Could not save that change');
    if (!row) { items.upsertLocal(item); return; }
    items.upsertLocal(row);
    if (undoLabel) {
      pushUndo(undoLabel, async () => {
        const back: Patch = {};
        for (const k of Object.keys(patch) as Array<keyof Patch>) (back as Record<string, unknown>)[k] = before[k];
        items.upsertLocal(await studio.updateBoardItem(item.id, back));
      }, origin);
    }
  };

  const makeLink = async () => {
    if (!active) return;
    const row = await run(() => studio.shareBoard(active, userId), 'Could not make the board link');
    if (row) setShare({ boardId: active.id, row });
  };
  const stopSharing = async () => {
    if (!active) return;
    if (!(await confirm('Stop sharing this board? The link stops working at once.'))) return;
    if (await run(() => studio.closeBoardShare(active.id).then(() => true), 'Could not close the board link')) setShare({ boardId: active.id, row: null });
  };
  const replaceLink = async () => {
    if (!active) return;
    if (!(await confirm('Make a new link? The old one stops working at once, and anyone you sent it to will need the new one.'))) return;
    const row = await run(() => studio.newBoardLink(active, userId), 'Could not make a new link');
    if (row) setShare({ boardId: active.id, row });
  };
  const copyLink = async (token: string) => {
    try { await navigator.clipboard.writeText(boardShareUrl(window.location.origin, token)); toast('Link copied', 'success'); }
    catch { toast('Could not copy: select the link and copy it', 'error'); }
  };

  const removeItem = async (item: MoodBoardItem) => {
    if (!(await confirm('Take this off the board? The library item stays.'))) return;
    if (await run(() => studio.removeBoardItem(item.id).then(() => true), 'Could not take that off the board')) { items.removeLocal(item.id); setSelectedId(null); }
  };

  const toFront = (item: MoodBoardItem) => save(item, { z: boardItems.reduce((m, i) => Math.max(m, i.z), 0) + 1 });

  // Dragging: pointer events, in percent of the canvas; one save when the card is let go.
  const startDrag = (e: React.PointerEvent, item: MoodBoardItem) => {
    if (e.button !== 0 || editing) return;
    setSelectedId(item.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX, startY = e.clientY;
    let moved = false;
    let last = { x: item.x, y: item.y };
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
      moved = true;
      const dx = ((ev.clientX - startX) / rect.width) * 100, dy = ((ev.clientY - startY) / rect.height) * 100;
      last = clampPoint(item.x + dx, item.y + dy, item.w);
      setDrag({ id: item.id, ...last });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      if (moved) void save(item, { x: Math.round(last.x * 10) / 10, y: Math.round(last.y * 10) / 10 }, 'Moved a card');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onKey = (e: React.KeyboardEvent, item: MoodBoardItem) => {
    if (editing) return;
    const step = e.shiftKey ? 5 : 1;
    const d = e.key === 'ArrowLeft' ? [-step, 0] : e.key === 'ArrowRight' ? [step, 0] : e.key === 'ArrowUp' ? [0, -step] : e.key === 'ArrowDown' ? [0, step] : null;
    if (d) { e.preventDefault(); void save(item, clampPoint(item.x + d[0], item.y + d[1], item.w), 'Moved a card'); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); void removeItem(item); }
    else if (e.key === 'Enter' && item.note) { e.preventDefault(); setEditing({ id: item.id, text: item.note }); }
  };

  const print = () => {
    if (!active) return;
    if (!printHtmlString(boardPrintHtml(active, boardItems, { titleOf: (i) => (i.media_id ? mediaById.get(i.media_id)?.title : '') || 'Untitled', srcOf, palette: colours }))) toast('Could not open the print dialog.', 'error');
  };

  const selected = boardItems.find((i) => i.id === selectedId) ?? null;

  if (boards.status === 'error') return <ErrorBar message={boards.error ?? 'Could not load the mood boards'} onRetry={() => void boards.reload()} />;

  return (
    <section aria-label="Mood boards" onKeyDown={(e) => {
      // "/" jumps to the board's search from anywhere in the boards (not while typing, not with a modifier).
      const t = e.target as HTMLElement;
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable && searchRef.current) { e.preventDefault(); searchRef.current.focus(); }
    }}>
      <div className={b.bar}>
        <input className={`${s.input} ${b.grow}`} aria-label="New board name" placeholder="New board, e.g. Maya: look" value={newName} maxLength={120}
          onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void createBoard(); }} />
        <select className={s.select} aria-label="Board type" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value as BoardTemplate)}>
          {BOARD_TEMPLATES.map((t) => <option key={t} value={t}>{TEMPLATE_INFO[t].label}</option>)}
        </select>
        <button type="button" className={s.btnPrimary} onClick={() => void createBoard()} disabled={!newName.trim()}>Create board</button>
      </div>
      {newTemplate !== 'free' && <p className={b.hint}>{TEMPLATE_INFO[newTemplate].blurb} It starts with {TEMPLATE_INFO[newTemplate].notes.length} note cards to fill in.</p>}

      {boards.status === 'loading' ? null : !boards.rows.length ? (
        <EmptyState icon={<LayoutGrid size={28} />} title="No boards yet" subtitle="Make a board for a character, a place, a tone or a palette, then pull references from the library onto it." />
      ) : (
        <>
          <div className={b.tabs} role="tablist" aria-label="Boards">
            {boards.rows.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={active?.id === r.id} className={b.tab} onClick={() => { setActiveId(r.id); setSelectedId(null); changeQuery(''); }}>{r.name}</button>
            ))}
          </div>
          {active && (
            <>
              <div className={b.bar}>
                {renaming === active.id
                  ? <input className={`${s.input} ${b.grow}`} aria-label="Board name" autoFocus defaultValue={active.name} maxLength={120} onBlur={(e) => void rename(active, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }} />
                  : <button type="button" className={s.btn} onClick={() => setRenaming(active.id)}>Rename</button>}
                <button type="button" className={s.btn} onClick={() => setPicking(true)}><ImagePlus size={12} /> Add from library</button>
                <button type="button" className={s.btn} aria-expanded={noting} onClick={() => setNoting((v) => !v)}><StickyNote size={12} /> Add note</button>
                <button type="button" className={s.btn} onClick={() => setPresenting(true)} disabled={!slides.length}><Presentation size={12} /> Slideshow</button>
                <button type="button" className={s.btn} onClick={print} disabled={!boardItems.length}><Printer size={12} /> Print / PDF</button>
                {canShape && <button type="button" className={s.btn} aria-expanded={shareOpen} onClick={() => setShareOpen((v) => !v)}><Link2 size={12} /> Share link</button>}
                <button type="button" className={s.btnDanger} onClick={() => void removeBoard(active)}><Trash2 size={12} /> Delete board</button>
              </div>
              {canShape && shareOpen && (
                <div className={b.share} role="group" aria-label="Share this board">
                  <p className={b.hint}>Anyone with the link can see this board: its cards, notes and the images on it. Not the rest of the library. You can stop it at any time.</p>
                  {currentShare === undefined ? <p className={b.hint}>Looking…</p> : currentShare ? (
                    <div className={b.bar}>
                      <input className={`${s.input} ${b.grow}`} aria-label="Board link" readOnly value={boardShareUrl(typeof window === 'undefined' ? '' : window.location.origin, currentShare.token)} onFocus={(e) => e.currentTarget.select()} />
                      <button type="button" className={s.btnPrimary} onClick={() => void copyLink(currentShare.token)}>Copy link</button>
                      <button type="button" className={s.btn} onClick={() => void replaceLink()}>New link</button>
                      <button type="button" className={s.btnDanger} onClick={() => void stopSharing()}>Stop sharing</button>
                    </div>
                  ) : (
                    <button type="button" className={s.btnPrimary} onClick={() => void makeLink()}>Make a link</button>
                  )}
                </div>
              )}
              {noting && (
                <div className={b.bar}>
                  <textarea className={`${s.textarea} ${b.grow}`} aria-label="Note text" rows={2} maxLength={1000} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="A line, a colour, a feeling..." />
                  <button type="button" className={s.btnPrimary} onClick={() => void addNote()} disabled={!noteText.trim()}>Add</button>
                </div>
              )}

              {boardItems.length > 0 && (
                <div className={b.search} role="search" aria-label="Search this board">
                  <Search size={14} aria-hidden />
                  <input ref={searchRef} type="search" className={b.searchInput} aria-label="Search this board" placeholder="Search this board ( / )" value={query} maxLength={80}
                    onChange={(e) => changeQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); goMatch(e.shiftKey ? -1 : 1); }
                      else if (e.key === 'Escape') { e.stopPropagation(); if (query) changeQuery(''); else e.currentTarget.blur(); }
                    }} />
                  <span className={b.count} role="status" aria-live="polite">{matchLabel(query, matchIds.length, current)}</span>
                  <button type="button" className={b.searchBtn} onClick={() => goMatch(-1)} disabled={!matchIds.length} aria-label="Previous match"><ChevronUp size={14} aria-hidden /></button>
                  <button type="button" className={b.searchBtn} onClick={() => goMatch(1)} disabled={!matchIds.length} aria-label="Next match"><ChevronDown size={14} aria-hidden /></button>
                  <button type="button" className={b.searchBtn} onClick={() => { changeQuery(''); searchRef.current?.focus(); }} disabled={!query} aria-label="Clear search"><X size={14} aria-hidden /></button>
                </div>
              )}
              <div ref={canvasRef} className={b.canvas} role="listbox" aria-label={`Board: ${active.name}`} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
                {found.active && !matchIds.length && <div className={b.empty} role="status">Nothing on this board matches “{query.trim()}”.</div>}
                {!boardItems.length && <div className={b.empty}>An empty board. Add items from the library or write a note card, then drag them where they belong.</div>}
                {boardItems.map((i) => {
                  const m = i.media_id ? mediaById.get(i.media_id) : undefined;
                  const pos = drag?.id === i.id ? drag : i;
                  const hit = matchById.get(i.id);
                  const why = hit?.fields.find((f) => f.field === 'notes' || f.field === 'tag' || f.field === 'source');
                  const label = i.note ? `Note: ${i.note.slice(0, 40)}` : `${m?.title || 'Untitled'}`;
                  return (
                    <div key={i.id} data-card-id={i.id} className={`${b.card} ${found.active && !hit ? b.filtered : ''} ${hit && matchIds[current] === i.id ? b.current : ''}`} role="option" aria-selected={selectedId === i.id} tabIndex={0} aria-label={`${label}. Arrow keys move it, Delete removes it.`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${i.w}%`, zIndex: i.z + 1 }}
                      onPointerDown={(e) => startDrag(e, i)} onKeyDown={(e) => onKey(e, i)} onFocus={() => setSelectedId(i.id)}
                      onDoubleClick={() => { if (i.note) setEditing({ id: i.id, text: i.note }); }}>
                      {i.note ? (
                        editing?.id === i.id
                          ? <textarea className={s.textarea} aria-label="Edit note" autoFocus rows={3} maxLength={1000} value={editing.text}
                              onChange={(e) => setEditing({ id: i.id, text: e.target.value })} onPointerDown={(e) => e.stopPropagation()}
                              onBlur={() => { const t = editing.text; setEditing(null); if (t.trim() && t !== i.note) void save(i, { note: t }, 'Edited a note'); }}
                              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setEditing(null); }} />
                          : <div className={b.noteText}><Hl text={i.note} query={query} /></div>
                      ) : m ? (
                        <>
                          <div className={b.visual}><MediaThumbVisual media={m} src={srcOf(i)} /></div>
                          <div className={b.caption}><Hl text={m.title || 'Untitled'} query={query} /></div>
                          {why && !highlightSegments(m.title, query).some((p) => p.hit) &&<div className={b.why}><Hl text={why.text} query={query} /></div>}
                        </>
                      ) : <div className={b.noteText}>This library item was removed.</div>}
                    </div>
                  );
                })}
              </div>

              {selected && (
                <div className={b.tools} role="toolbar" aria-label="Selected card">
                  {(Object.keys(SIZES) as Array<keyof typeof SIZES>).map((k) => (
                    <button key={k} type="button" className={s.btn} aria-pressed={selected.w === SIZES[k]} onClick={() => void save(selected, { w: SIZES[k], ...clampPoint(selected.x, selected.y, SIZES[k]) }, 'Resized a card')}>{k[0].toUpperCase() + k.slice(1)}</button>
                  ))}
                  <button type="button" className={s.btn} onClick={() => void toFront(selected)}><ArrowUpToLine size={12} /> Bring to front</button>
                  {selected.note && <button type="button" className={s.btn} onClick={() => setEditing({ id: selected.id, text: selected.note ?? '' })}>Edit note</button>}
                  <button type="button" className={s.btnDanger} onClick={() => void removeItem(selected)}><Trash2 size={12} /> Remove</button>
                </div>
              )}
              {colours.length > 0 && (
                <div className={b.swatches} aria-label="Colours on this board"><Palette size={13} aria-hidden /> Colours
                  {colours.map((c) => <span key={c} className={b.sw} style={{ background: c }} title={c} />)}
                </div>
              )}
            </>
          )}
        </>
      )}

      {presenting && active && slides.length > 0 && (
        <BoardSlideshow name={active.name} slides={slides} startIndex={Math.max(0, slides.findIndex((x) => x.id === selectedId))} onClose={() => setPresenting(false)} />
      )}
      {picking && active && (
        <MediaPicker title={`Add to "${active.name}"`} projectId={project.id} userId={userId} media={media}
          excludeIds={new Set(boardItems.map((i) => i.media_id).filter((x): x is string => !!x))} confirmLabel="Add to board"
          onPick={addMedia} onClose={() => setPicking(false)} />
      )}
    </section>
  );
}
