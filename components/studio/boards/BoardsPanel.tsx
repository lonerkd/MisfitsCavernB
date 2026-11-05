'use client';

// Mood boards (Studio > Library): boards as objects of their own, each an arrangement of library items and note
// cards on a canvas. Everything here is saved: a board, its cards, where they sit, how big they are. Positions are
// percentages of the board, so it looks the same on any screen and prints the same.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Palette, Printer, StickyNote, Trash2, ArrowUpToLine, LayoutGrid } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { pushUndo, undoOrigin } from '@/lib/os/undo';
import {
  BOARD_TEMPLATES, SIZES, TEMPLATE_INFO, clampPoint, dominantColours, mediaSrc, studio, useMoodBoardItems, useMoodBoards, useSignedUrls,
  type BoardTemplate, type MoodBoard, type MoodBoardItem,
} from '@/lib/studio';
import { boardPrintHtml } from '@/lib/studio/boards-print';
import { useStudio } from '../StudioContext';
import { ErrorBar } from '../ui';
import { MediaThumbVisual } from '../media/MediaThumb';
import { MediaPicker } from '../media/MediaPicker';
import s from '../studio.module.css';
import b from './boards.module.css';

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
  const { project, userId, media } = useStudio();
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

  const active: MoodBoard | undefined = boards.rows.find((r) => r.id === activeId) ?? boards.rows[0];
  const boardItems = useMemo(() => items.rows.filter((i) => i.board_id === active?.id), [items.rows, active?.id]);
  const mediaById = useMemo(() => new Map(media.rows.map((m) => [m.id, m])), [media.rows]);
  const signed = useSignedUrls(boardItems.map((i) => { const m = i.media_id ? mediaById.get(i.media_id) : null; return m && (m.kind === 'image' || m.kind === 'video') ? m.storage_path : null; }));
  const srcOf = useCallback((i: MoodBoardItem) => { const m = i.media_id ? mediaById.get(i.media_id) : null; return m ? mediaSrc(m, signed) : null; }, [mediaById, signed]);

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
    const w = window.open('', '_blank');
    if (!w) { toast('Allow pop-ups to print the board.', 'error'); return; }
    w.document.write(boardPrintHtml(active, boardItems, { titleOf: (i) => (i.media_id ? mediaById.get(i.media_id)?.title : '') || 'Untitled', srcOf, palette: colours }));
    w.document.close();
    w.focus();
    w.print();
  };

  const selected = boardItems.find((i) => i.id === selectedId) ?? null;

  if (boards.status === 'error') return <ErrorBar message={boards.error ?? 'Could not load the mood boards'} onRetry={() => void boards.reload()} />;

  return (
    <section aria-label="Mood boards">
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
              <button key={r.id} type="button" role="tab" aria-selected={active?.id === r.id} className={b.tab} onClick={() => { setActiveId(r.id); setSelectedId(null); }}>{r.name}</button>
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
                <button type="button" className={s.btn} onClick={print} disabled={!boardItems.length}><Printer size={12} /> Print / PDF</button>
                <button type="button" className={s.btnDanger} onClick={() => void removeBoard(active)}><Trash2 size={12} /> Delete board</button>
              </div>
              {noting && (
                <div className={b.bar}>
                  <textarea className={`${s.textarea} ${b.grow}`} aria-label="Note text" rows={2} maxLength={1000} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="A line, a colour, a feeling..." />
                  <button type="button" className={s.btnPrimary} onClick={() => void addNote()} disabled={!noteText.trim()}>Add</button>
                </div>
              )}

              <div ref={canvasRef} className={b.canvas} role="listbox" aria-label={`Board: ${active.name}`} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
                {!boardItems.length && <div className={b.empty}>An empty board. Add items from the library or write a note card, then drag them where they belong.</div>}
                {boardItems.map((i) => {
                  const m = i.media_id ? mediaById.get(i.media_id) : undefined;
                  const pos = drag?.id === i.id ? drag : i;
                  const label = i.note ? `Note: ${i.note.slice(0, 40)}` : `${m?.title || 'Untitled'}`;
                  return (
                    <div key={i.id} className={b.card} role="option" aria-selected={selectedId === i.id} tabIndex={0} aria-label={`${label}. Arrow keys move it, Delete removes it.`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${i.w}%`, zIndex: i.z + 1 }}
                      onPointerDown={(e) => startDrag(e, i)} onKeyDown={(e) => onKey(e, i)} onFocus={() => setSelectedId(i.id)}
                      onDoubleClick={() => { if (i.note) setEditing({ id: i.id, text: i.note }); }}>
                      {i.note ? (
                        editing?.id === i.id
                          ? <textarea className={s.textarea} aria-label="Edit note" autoFocus rows={3} maxLength={1000} value={editing.text}
                              onChange={(e) => setEditing({ id: i.id, text: e.target.value })} onPointerDown={(e) => e.stopPropagation()}
                              onBlur={() => { const t = editing.text; setEditing(null); if (t.trim() && t !== i.note) void save(i, { note: t }, 'Edited a note'); }}
                              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setEditing(null); }} />
                          : <div className={b.noteText}>{i.note}</div>
                      ) : m ? (
                        <>
                          <div className={b.visual}><MediaThumbVisual media={m} src={srcOf(i)} /></div>
                          <div className={b.caption}>{m.title || 'Untitled'}</div>
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

      {picking && active && (
        <MediaPicker title={`Add to "${active.name}"`} projectId={project.id} userId={userId} media={media}
          excludeIds={new Set(boardItems.map((i) => i.media_id).filter((x): x is string => !!x))} confirmLabel="Add to board"
          onPick={addMedia} onClose={() => setPicking(false)} />
      )}
    </section>
  );
}
