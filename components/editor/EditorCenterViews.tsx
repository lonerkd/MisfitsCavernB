'use client';

import { SCRIPT_TEXT_HINTS } from './textHints';
import { moveTarget, focusMoved } from '@/lib/util/reorderKeys';
import React, { useState } from 'react';
import { StructurePicker } from '@/components/story/StructurePicker';
import { getStructure, checkCoverage } from '@/lib/story/structures';
import { motion } from 'framer-motion';
import type { ScriptLine } from '@/lib/scriptos/types';
import { TYPE_COLORS } from './editorConstants';
import { CARD_COLORS } from '@/lib/scriptos/sceneVisuals';
import { usePillZone } from '@/lib/os/PillContext';
import { usePresence } from '@/lib/os/PresenceContext';

// ── BOARD: drag-and-drop scene cards ────────────────────────────────────────
export function BoardView({
  scenesList, lines, sceneColors, sceneNotes, sceneWordCounts,
  dragSceneIdx, setDragSceneIdx, dropSceneIdx, setDropSceneIdx,
  jumpToScene, setSceneNote, reorderScenes,
}: {
  scenesList: ScriptLine[];
  lines: ScriptLine[];
  /** Per scene, by index in scenesList. */
  sceneColors: Array<string | null>;
  sceneNotes: string[];
  sceneWordCounts: number[];
  dragSceneIdx: number | null;
  setDragSceneIdx: (i: number | null) => void;
  dropSceneIdx: number | null;
  setDropSceneIdx: (i: number | null) => void;
  jumpToScene: (sceneIndex: number) => void;
  setSceneNote: (sceneIndex: number, note: string) => void;
  reorderScenes: (from: number, to: number) => void;
}) {
  if (scenesList.length === 0) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: 20, alignContent: 'flex-start' }}>
        <div style={{ width: '100%', textAlign: 'center', color: 'var(--fg-dim)', marginTop: 100, fontStyle: 'italic' }}>No scenes to display on board.</div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: 20, alignContent: 'flex-start' }}>
      {scenesList.map((scene, i) => (
        <SceneBoardCard
          key={i} scene={scene} index={i} lines={lines}
          cardColor={sceneColors[i] || CARD_COLORS[i % CARD_COLORS.length]}
          wordCount={sceneWordCounts[i] || 0}
          note={sceneNotes[i] || ''}
          isDragging={dragSceneIdx === i}
          isDropTarget={dropSceneIdx === i && dragSceneIdx !== null && dragSceneIdx !== i}
          onJump={() => jumpToScene(i)}
          onMove={(to) => { reorderScenes(i, to); focusMoved('board', to); }}
          count={scenesList.length}
          onSetNote={note => setSceneNote(i, note)}
          onDragStart={(e) => { setDragSceneIdx(i); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
          onDragOver={(e) => { e.preventDefault(); if (dropSceneIdx !== i) setDropSceneIdx(i); }}
          onDragEnd={() => { setDragSceneIdx(null); setDropSceneIdx(null); }}
          onDrop={(e) => { e.preventDefault(); if (dragSceneIdx !== null && dragSceneIdx !== i) reorderScenes(dragSceneIdx, i); setDragSceneIdx(null); setDropSceneIdx(null); }}
        />
      ))}
    </div>
  );
}

function SceneBoardCard({
  scene, index, lines, cardColor, wordCount, note, isDragging, isDropTarget,
  onJump, onMove, count, onSetNote, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  scene: ScriptLine;
  index: number;
  lines: ScriptLine[];
  cardColor: string;
  wordCount: number;
  note: string;
  isDragging: boolean;
  isDropTarget: boolean;
  onJump: () => void;
  onMove: (to: number) => void;
  count: number;
  onSetNote: (note: string) => void;
  onDragStart: (e: any) => void;
  onDragOver: (e: any) => void;
  onDragEnd: () => void;
  onDrop: (e: any) => void;
}) {
  const estMins = Math.max(1, Math.round(wordCount / 185 * 0.8));
  const startIdx = lines.findIndex(l => l.id === scene.id);
  const sceneCast = React.useMemo(() => {
    const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.type === 'slug');
    const body = lines.slice(startIdx + 1, endIdx === -1 ? lines.length : endIdx);
    return [...new Set(body.filter(l => l.type === 'character').map(l => l.text.trim()))];
  }, [lines, startIdx]);

  const zoneHandlers = usePillZone({
    module: 'editor',
    title: scene.text,
    accent: cardColor,
    fields: [
      { label: 'Cast', value: sceneCast.length ? sceneCast.join(', ') : '—' },
      { label: 'Words', value: `${wordCount}`, color: cardColor },
    ],
    actions: [
      { id: 'jump-scene', slot: 'jump', label: '→ Jump to Scene', onClick: onJump },
    ],
  }, 2);

  const { onlineUsers } = usePresence();
  const activeUsers = React.useMemo(() => onlineUsers.filter(u => u.sceneIdx === index), [onlineUsers, index]);

  return (
    <div
      onClick={() => { onJump(); zoneHandlers.onClick(); }}
      role="group" tabIndex={0} data-reorder="board" data-index={index}
      aria-label={`Scene ${index + 1}: ${scene.text}. Enter opens it in the script. Alt and the arrow keys move it.`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter') { e.preventDefault(); onJump(); return; }
        const to = moveTarget(e.key, e.altKey, index, count);
        if (to !== null) { e.preventDefault(); onMove(to); }
      }}
      onMouseEnter={zoneHandlers.onMouseEnter}
      onMouseLeave={zoneHandlers.onMouseLeave}
      style={{ cursor: 'grab' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
        whileHover={{ y: -4, boxShadow: `0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px ${cardColor}25` }}

      title="Drag, or Alt + arrow keys, to reorder · click to open in the script"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      style={{
        width: 272, minHeight: 180,
        background: 'var(--bg-3)',
        border: `1px solid ${isDropTarget ? cardColor : 'rgba(var(--ink-rgb), 0.06)'}`,
        borderTop: `2px solid ${cardColor}`,
        borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column',
        opacity: isDragging ? 0.4 : 1,
        transition: 'box-shadow 0.35s, border-color 0.2s, opacity 0.2s', cursor: 'grab',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>Scene {index + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeUsers.length > 0 && (
            <div style={{ display: 'flex', marginRight: 4 }}>
              {activeUsers.slice(0, 3).map((u, ui) => (
                <div key={u.userId} title={`${u.email} is here`} style={{
                  width: 16, height: 16, borderRadius: '50%', background: u.color, color: 'var(--on-accent)',
                  border: '2px solid var(--bg-3)', marginLeft: ui > 0 ? -6 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 'max(8px, var(--mc-min-font, 0px))', fontWeight: 700, zIndex: 3 - ui,
                }}>
                  {u.email[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', color: cardColor, fontFamily: 'var(--mono)' }}>{wordCount}w · ~{estMins}m</span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: cardColor, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scene.text}</div>
      <textarea
        defaultValue={note}
        onClick={e => e.stopPropagation()}
        onBlur={e => onSetNote(e.target.value)}
        placeholder="Beat / summary — what has to happen here?"
        {...SCRIPT_TEXT_HINTS}
        style={{ width: '100%', minHeight: 44, resize: 'none', background: 'var(--sunken)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, padding: '6px 8px', color: 'var(--fg)', fontSize: 11, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
      />
      <div style={{ flex: 1, fontSize: 11, color: 'var(--fg-dim)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {lines.slice(startIdx + 1, startIdx + 5).filter(l => l.type === 'action').map(l => l.text).join(' ')}
      </div>
      </motion.div>
    </div>
  );
}

// ── OUTLINE: filterable scene list with tag colors ──────────────────────────
export function OutlineView({
  sceneFilter, setSceneFilter, filteredScenes, scenesList, lines,
  sceneColors, sceneNotes, jumpToScene, tagScene, onStoryInterview,
}: {
  sceneFilter: 'all' | 'int' | 'ext' | 'day' | 'night';
  setSceneFilter: (f: 'all' | 'int' | 'ext' | 'day' | 'night') => void;
  filteredScenes: ScriptLine[];
  scenesList: ScriptLine[];
  lines: ScriptLine[];
  sceneColors: Array<string | null>;
  sceneNotes: string[];
  jumpToScene: (sceneIndex: number) => void;
  tagScene: (sceneIndex: number, color: string) => void;
  onStoryInterview?: () => void;
}) {
  const [structureId, setStructureId] = useState('none');
  // The colour palette is closed until a scene's tag is pressed: six dots on every row were noise, and each is a 44 pt target on a phone.
  const [paletteFor, setPaletteFor] = useState<number | null>(null);
  const structure = getStructure(structureId)!;
  const positions = scenesList.length > 1 ? scenesList.map((_, i) => i / (scenesList.length - 1)) : scenesList.map(() => 0);
  const coverage = checkCoverage(structure, positions);
  const coveredCount = coverage.filter((c) => c.covered).length;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <StructurePicker value={structureId} onChange={setStructureId} />
        {structure.id !== 'none' && (
          <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            {coveredCount}/{coverage.length} beats covered
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'int', 'ext', 'day', 'night'] as const).map(f => (
          <button key={f} onClick={() => setSceneFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', background: sceneFilter === f ? 'rgba(var(--ink-rgb), 0.12)' : 'rgba(var(--ink-rgb), 0.03)', color: sceneFilter === f ? 'var(--fg-strong)' : 'var(--fg-muted)', cursor: 'pointer', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)', alignSelf: 'center' }}>{filteredScenes.length} scene{filteredScenes.length !== 1 ? 's' : ''}</span>
        {onStoryInterview && (
          <button onClick={onStoryInterview} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', background: 'rgba(var(--ink-rgb), 0.08)', color: 'var(--fg-strong)', cursor: 'pointer' }}>Interview</button>
        )}
      </div>
      {filteredScenes.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 80, fontStyle: 'italic' }}>No scenes match the filter.</div>
      ) : (
        filteredScenes.map((scene, i) => {
          const globalIdx = scenesList.indexOf(scene);
          const startIdx = lines.findIndex(l => l.id === scene.id);
          const endIdx = globalIdx + 1 < scenesList.length ? lines.findIndex(l => l.id === scenesList[globalIdx + 1].id) : lines.length;
          const sceneLines = lines.slice(startIdx, endIdx);
          const sceneChars = [...new Set(sceneLines.filter(l => l.type === 'character').map(l => l.text.trim()))];
          const wc = sceneLines.reduce((s, l) => s + l.text.split(/\s+/).filter(Boolean).length, 0);
          const actionPreview = sceneLines.filter(l => l.type === 'action').slice(0, 2).map(l => l.text).join(' ');
          return (
            <motion.div key={scene.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
              {(() => { const tag = sceneColors[globalIdx]; return (
                <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700, color: tag || 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0, paddingTop: 2, borderLeft: tag ? `3px solid ${tag}` : '3px solid transparent', paddingRight: 6 }}>{globalIdx + 1}</div>
              ); })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  <div onClick={() => jumpToScene(globalIdx)} title="Open this scene in the script" style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS.slug, textTransform: 'var(--caps)', cursor: 'pointer' }}>{scene.text}</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {paletteFor === globalIdx
                      ? CARD_COLORS.map(color => {
                        const active = sceneColors[globalIdx] === color;
                        return (
                        <button
                          key={color}
                          type="button"
                          title={active ? 'Remove tag' : 'Tag scene'}
                          aria-label={`${active ? 'Remove' : 'Set'} scene colour ${color}`}
                          aria-pressed={active}
                          onClick={() => { tagScene(globalIdx, color); setPaletteFor(null); }}
                          // The button is the touch target (44 pt on a phone, by the global rule); the visible dot stays small inside it.
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <span aria-hidden style={{ width: active ? 14 : 10, height: active ? 14 : 10, borderRadius: '50%', background: color, border: active ? '2px solid #fff' : '1px solid rgba(var(--ink-rgb), 0.1)', transition: 'all 0.15s' }} />
                        </button>
                      ); })
                      : (
                        <button
                          type="button"
                          title="Tag this scene with a colour"
                          aria-label={sceneColors[globalIdx] ? `Scene colour ${sceneColors[globalIdx]}. Change` : 'Tag scene with a colour'}
                          aria-expanded={false}
                          onClick={() => setPaletteFor(globalIdx)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <span aria-hidden style={{ width: 14, height: 14, borderRadius: '50%', boxSizing: 'border-box', background: sceneColors[globalIdx] || 'transparent', border: sceneColors[globalIdx] ? '2px solid #fff' : '1.5px dashed rgba(var(--ink-rgb), 0.35)' }} />
                        </button>
                      )}
                  </div>
                </div>
                {sceneNotes[globalIdx] && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4, fontStyle: 'italic' }}>“{sceneNotes[globalIdx]}”</div>}
                {actionPreview && <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actionPreview}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sceneChars.map(c => (<span key={c} style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', background: 'color-mix(in srgb, var(--warn) 10%, transparent)', color: TYPE_COLORS.character, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{c}</span>))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>{wc}w</div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
