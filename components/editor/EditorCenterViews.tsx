'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ScriptLine } from '@/types/screenplay';
import type { CharacterStats } from '@/lib/scriptos/characters';
import type { LintIssue } from '@/lib/scriptos/validator';
import { TYPE_COLORS } from './editorConstants';
import { CARD_COLORS, getSceneType, sceneTypeColor } from '@/lib/scriptos/sceneVisuals';
import { usePillZone } from '@/lib/context/PillContext';
import { usePresence } from '@/lib/context/PresenceContext';

/* =========================================================================
   ScriptOS editor — the three read-mostly center-stage tabs (Board, Outline,
   Stats). Extracted from the monolithic editor page: each is a pure view over
   derived script data plus a handful of callbacks, with no state of its own
   beyond what the page already tracks — behaviour-preserving, not a rewrite.
   The Write (textarea) and Preview tabs stay in the page itself: they're
   tightly wired to the live cursor/keyboard/collaboration state and moving
   them would add indirection without reducing real complexity.
   ========================================================================= */

// ── BOARD: drag-and-drop scene cards ────────────────────────────────────────
export function BoardView({
  scenesList, lines, sceneColors, sceneNotes, sceneWordCounts,
  dragSceneIdx, setDragSceneIdx, dropSceneIdx, setDropSceneIdx,
  jumpToScene, setSceneNote, reorderScenes,
}: {
  scenesList: ScriptLine[];
  lines: ScriptLine[];
  sceneColors: Record<string, string>;
  sceneNotes: Record<string, string>;
  sceneWordCounts: number[];
  dragSceneIdx: number | null;
  setDragSceneIdx: (i: number | null) => void;
  dropSceneIdx: number | null;
  setDropSceneIdx: (i: number | null) => void;
  jumpToScene: (sceneIndex: number) => void;
  setSceneNote: (sceneText: string, note: string) => void;
  reorderScenes: (from: number, to: number) => void;
}) {
  if (scenesList.length === 0) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: 20, alignContent: 'flex-start' }}>
        <div style={{ width: '100%', textAlign: 'center', color: '#888', marginTop: 100, fontStyle: 'italic' }}>No scenes to display on board.</div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: 20, alignContent: 'flex-start' }}>
      {scenesList.map((scene, i) => (
        <SceneBoardCard
          key={i} scene={scene} index={i} lines={lines}
          cardColor={sceneColors[scene.text.trim().toUpperCase()] || CARD_COLORS[i % CARD_COLORS.length]}
          wordCount={sceneWordCounts[i] || 0}
          note={sceneNotes[scene.text.trim().toUpperCase()] || ''}
          isDragging={dragSceneIdx === i}
          isDropTarget={dropSceneIdx === i && dragSceneIdx !== null && dragSceneIdx !== i}
          onJump={() => jumpToScene(i)}
          onSetNote={note => setSceneNote(scene.text, note)}
          onDragStart={(e) => { setDragSceneIdx(i); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
          onDragOver={(e) => { e.preventDefault(); if (dropSceneIdx !== i) setDropSceneIdx(i); }}
          onDragEnd={() => { setDragSceneIdx(null); setDropSceneIdx(null); }}
          onDrop={(e) => { e.preventDefault(); if (dragSceneIdx !== null && dragSceneIdx !== i) reorderScenes(dragSceneIdx, i); setDragSceneIdx(null); setDropSceneIdx(null); }}
        />
      ))}
    </div>
  );
}

// Individual scene card — its own component (not inlined in the .map above)
// so it can call usePillZone: hovering it sharpens the Pill's context down
// from "editor" to this specific scene — cast + word count + a real Jump
// action — a concrete instance of the zone drill-down the Pill's own code
// comments describe but that no page had wired up until now.
function SceneBoardCard({
  scene, index, lines, cardColor, wordCount, note, isDragging, isDropTarget,
  onJump, onSetNote, onDragStart, onDragOver, onDragEnd, onDrop,
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
  }, [lines, startIdx, scene.id]);

  const zoneHandlers = usePillZone({
    module: 'editor',
    title: scene.text,
    accent: cardColor,
    fields: [
      { label: 'Cast', value: sceneCast.length ? sceneCast.join(', ') : '—' },
      { label: 'Words', value: `${wordCount}`, color: cardColor },
    ],
    actions: [
      { id: 'jump-scene', label: '→ Jump to Scene', onClick: onJump },
    ],
  }, 2);

  const { onlineUsers } = usePresence();
  const activeUsers = React.useMemo(() => onlineUsers.filter(u => u.sceneIdx === index), [onlineUsers, index]);

  return (
    <div
      onClick={() => { onJump(); zoneHandlers.onClick(); }}
      onMouseEnter={zoneHandlers.onMouseEnter}
      onMouseLeave={zoneHandlers.onMouseLeave}
      style={{ cursor: 'grab' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
        whileHover={{ y: -4, boxShadow: `0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px ${cardColor}25` }}

      title="Drag to reorder · click to open in the script"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      style={{
        width: 272, minHeight: 180,
        background: 'var(--bg-3)',
        border: `1px solid ${isDropTarget ? cardColor : 'rgba(255,255,255,0.06)'}`,
        borderTop: `2px solid ${cardColor}`,
        borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column',
        opacity: isDragging ? 0.4 : 1,
        transition: 'box-shadow 0.35s, border-color 0.2s, opacity 0.2s', cursor: 'grab',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Scene {index + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeUsers.length > 0 && (
            <div style={{ display: 'flex', marginRight: 4 }}>
              {activeUsers.slice(0, 3).map((u, ui) => (
                <div key={u.userId} title={`${u.email} is here`} style={{
                  width: 16, height: 16, borderRadius: '50%', background: u.color, color: '#fff',
                  border: '2px solid var(--bg-3)', marginLeft: ui > 0 ? -6 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, zIndex: 3 - ui,
                }}>
                  {u.email[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <span style={{ fontSize: 9, color: cardColor, fontFamily: 'var(--mono)' }}>{wordCount}w · ~{estMins}m</span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: cardColor, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scene.text}</div>
      <textarea
        defaultValue={note}
        onClick={e => e.stopPropagation()}
        onBlur={e => onSetNote(e.target.value)}
        placeholder="Beat / summary — what has to happen here?"
        style={{ width: '100%', minHeight: 44, resize: 'none', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 8px', color: '#ddd', fontSize: 11, lineHeight: 1.5, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
      />
      <div style={{ flex: 1, fontSize: 11, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {lines.slice(startIdx + 1, startIdx + 5).filter(l => l.type === 'action').map(l => l.text).join(' ')}
      </div>
      </motion.div>
    </div>
  );
}

// ── OUTLINE: filterable scene list with tag colors ──────────────────────────
export function OutlineView({
  sceneFilter, setSceneFilter, filteredScenes, scenesList, lines,
  sceneColors, sceneNotes, jumpToScene, tagScene,
}: {
  sceneFilter: 'all' | 'int' | 'ext' | 'day' | 'night';
  setSceneFilter: (f: 'all' | 'int' | 'ext' | 'day' | 'night') => void;
  filteredScenes: ScriptLine[];
  scenesList: ScriptLine[];
  lines: ScriptLine[];
  sceneColors: Record<string, string>;
  sceneNotes: Record<string, string>;
  jumpToScene: (sceneIndex: number) => void;
  tagScene: (sceneText: string, color: string) => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'int', 'ext', 'day', 'night'] as const).map(f => (
          <button key={f} onClick={() => setSceneFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', background: sceneFilter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)', color: sceneFilter === f ? '#fff' : 'var(--fg-muted)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)', alignSelf: 'center' }}>{filteredScenes.length} scene{filteredScenes.length !== 1 ? 's' : ''}</span>
      </div>
      {filteredScenes.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#666', marginTop: 80, fontStyle: 'italic' }}>No scenes match the filter.</div>
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
            <motion.div key={scene.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {(() => { const tag = sceneColors[scene.text.trim().toUpperCase()]; return (
                <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 700, color: tag || 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0, paddingTop: 2, borderLeft: tag ? `3px solid ${tag}` : '3px solid transparent', paddingRight: 6 }}>{globalIdx + 1}</div>
              ); })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div onClick={() => jumpToScene(globalIdx)} title="Open this scene in the script" style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS.slug, textTransform: 'uppercase', cursor: 'pointer' }}>{scene.text}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {CARD_COLORS.map(color => {
                      const active = sceneColors[scene.text.trim().toUpperCase()] === color;
                      return (
                      <button
                        key={color}
                        title={active ? 'Remove tag' : 'Tag scene'}
                        onClick={() => tagScene(scene.text, color)}
                        style={{ width: active ? 14 : 10, height: active ? 14 : 10, borderRadius: '50%', background: color, border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 0, transition: 'all 0.15s' }}
                      />
                    ); })}
                  </div>
                </div>
                {sceneNotes[scene.text.trim().toUpperCase()] && <div style={{ fontSize: 12, color: '#bbb', marginBottom: 4, fontStyle: 'italic' }}>“{sceneNotes[scene.text.trim().toUpperCase()]}”</div>}
                {actionPreview && <div style={{ fontSize: 12, color: '#888', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actionPreview}</div>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {sceneChars.map(c => (<span key={c} style={{ fontSize: 9, background: 'rgba(255,170,0,0.1)', color: TYPE_COLORS.character, padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>{c}</span>))}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>{wc}w</div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}

// ── STATS: analytics dashboard ──────────────────────────────────────────────
export function StatsView({
  currentScriptTitle, wordCount, pageEst, scenesList, uniqueLocations, chars,
  charStats, dialogueRatio, sceneWordCounts, actStructure, sceneCharMap,
  currentSceneIdx, lintIssues,
}: {
  currentScriptTitle?: string;
  wordCount: number;
  pageEst: number;
  scenesList: ScriptLine[];
  uniqueLocations: [string, number][];
  chars: string[];
  charStats: CharacterStats[];
  dialogueRatio: number;
  sceneWordCounts: number[];
  actStructure: { act1End: number; act2End: number; act2Start: number; act3Start: number };
  sceneCharMap: Record<number, string[]>;
  currentSceneIdx: number;
  lintIssues: LintIssue[];
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 36 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, color: 'var(--fg)' }}>SCRIPT ANALYTICS</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>{currentScriptTitle}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 40 }}>
        {[
          { label: 'Words',   value: wordCount.toLocaleString(), color: '#6366f1', sub: `${pageEst} pages` },
          { label: 'Runtime', value: `${Math.ceil(pageEst * 0.8)}m`, color: '#10b981', sub: `~${Math.round(pageEst * 0.8 * 60)}s total` },
          { label: 'Scenes',  value: `${scenesList.length}`, color: '#d7340b', sub: `${uniqueLocations.length} locations` },
          { label: 'Cast',    value: `${chars.length}`, color: '#f59e0b', sub: `${charStats[0]?.name ?? '—'} leads` },
          { label: 'Balance', value: `${dialogueRatio}%`, color: '#8b5cf6', sub: 'dialogue' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px', transition: 'border-color 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '40'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', opacity: 0.6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {scenesList.length > 0 && (() => {
        const totalWc = sceneWordCounts.reduce((a, b) => a + b, 0) || 1;
        const { act1End, act2End } = actStructure;
        return (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 14 }}>Scene Timeline</div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              {[
                { label: 'INT/Day', color: '#6366f1' }, { label: 'INT/Night', color: '#4338ca' },
                { label: 'EXT/Day', color: '#d97706' }, { label: 'EXT/Night', color: '#92400e' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 1 }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', gap: 1, background: 'var(--bg-3)', padding: 4 }}>
              {scenesList.map((scene, i) => {
                const wc = sceneWordCounts[i] || 0;
                const w = Math.max(4, (wc / totalWc) * 100);
                const color = sceneTypeColor(scene);
                const sceneChars = sceneCharMap[i] || [];
                return (
                  <div
                    key={scene.id}
                    title={`Scene ${i + 1}: ${scene.text} · ${wc}w · ${sceneChars.join(', ')}`}
                    style={{
                      flex: `0 0 ${w}%`, background: color,
                      borderRadius: 3, cursor: 'pointer', opacity: 0.85,
                      minWidth: 4, position: 'relative',
                      transition: 'opacity 0.15s, transform 0.15s',
                      border: i === currentSceneIdx ? '1px solid rgba(255,255,255,0.6)' : 'none',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = ''; }}
                  />
                );
              })}
            </div>

            {scenesList.length > 2 && (() => {
              const act1Pct = sceneWordCounts.slice(0, act1End).reduce((a, b) => a + b, 0) / totalWc * 100;
              const act2Pct = sceneWordCounts.slice(0, act2End).reduce((a, b) => a + b, 0) / totalWc * 100;
              return (
                <div style={{ position: 'relative', height: 20, marginTop: 2 }}>
                  {[
                    { pct: 0,       label: 'ACT I' },
                    { pct: act1Pct, label: 'ACT II' },
                    { pct: act2Pct, label: 'ACT III' },
                  ].map(({ pct, label }) => (
                    <div key={label} style={{ position: 'absolute', left: `${pct}%`, transform: pct > 0 ? 'translateX(-50%)' : '', top: 2 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: 'flex', marginTop: 2 }}>
              {scenesList.map((scene, i) => {
                const wc = sceneWordCounts[i] || 0;
                const w = Math.max(4, (wc / totalWc) * 100);
                return (
                  <div key={scene.id} style={{ flex: `0 0 ${w}%`, minWidth: 4, display: 'flex', justifyContent: 'center' }}>
                    {w > 3 && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)', opacity: 0.5 }}>{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {charStats.length > 0 && scenesList.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 14 }}>Character Presence</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: Math.max(400, scenesList.length * 22) }}>
              {charStats.slice(0, 8).map((cs, ci) => {
                const charColor = CARD_COLORS[ci % CARD_COLORS.length];
                return (
                  <div key={cs.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 76, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: charColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {cs.name}
                    </div>
                    <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                      {scenesList.map((scene, si) => {
                        const appearsHere = (sceneCharMap[si] || []).includes(cs.name);
                        return (
                          <div
                            key={si}
                            title={appearsHere ? `${cs.name} in Scene ${si + 1}` : `Not in Scene ${si + 1}`}
                            style={{
                              flex: 1, height: 14, borderRadius: 2, minWidth: 8,
                              background: appearsHere ? charColor : 'rgba(255,255,255,0.04)',
                              opacity: appearsHere ? 0.85 : 1,
                              transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => { if (appearsHere) e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={e => { if (appearsHere) e.currentTarget.style.opacity = '0.85'; }}
                          />
                        );
                      })}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', flexShrink: 0, width: 30, textAlign: 'right' }}>
                      {cs.scenesIn.length}sc
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 2, marginLeft: 84 }}>
                {scenesList.map((_, si) => (
                  <div key={si} style={{ flex: 1, minWidth: 8 }}>
                    {(si + 1) % Math.max(1, Math.floor(scenesList.length / 8)) === 0 && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)', opacity: 0.4, textAlign: 'center' }}>{si + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 14 }}>Dialogue vs Action</div>
        <div style={{ display: 'flex', gap: 1, borderRadius: 6, overflow: 'hidden', height: 20 }}>
          <div style={{ width: `${dialogueRatio}%`, background: '#6366f1', transition: 'width 0.5s', minWidth: dialogueRatio > 0 ? 2 : 0 }} />
          <div style={{ flex: 1, background: '#d7340b' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#6366f1' }}>{dialogueRatio}% Dialogue</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#d7340b' }}>{100 - dialogueRatio}% Action</span>
        </div>
      </div>

      {scenesList.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 14 }}>Scene Breakdown</div>
          <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px 60px 52px', gap: 0, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['#', 'Scene', 'Type', 'Cast', 'Words', 'Time'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {scenesList.map((scene, i) => {
              const { isInt, isExt, isDay, isNight } = getSceneType(scene);
              const color = sceneTypeColor(scene);
              const wc = sceneWordCounts[i] || 0;
              const sceneCast = sceneCharMap[i] || [];
              const estSecs = Math.round(wc / 185 * 60);
              const timeStr = estSecs >= 60 ? `${Math.floor(estSecs/60)}m${estSecs%60}s` : `${estSecs}s`;
              const isActive = i === currentSceneIdx;
              return (
                <div
                  key={scene.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px 60px 52px',
                    gap: 0, padding: '9px 14px',
                    background: isActive ? `${color}0d` : 'transparent',
                    borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{i + 1}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8, textTransform: 'uppercase' }}>
                    {scene.text.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')}
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color, background: `${color}18`, padding: '1px 5px', borderRadius: 3 }}>
                      {isInt?'INT':isExt?'EXT':'?'}/{isDay?'D':isNight?'N':'?'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{sceneCast.length}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-muted)' }}>{wc.toLocaleString()}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{timeStr}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 12 }}>Script Health</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { count: lintIssues.filter(i => i.type === 'error').length,   label: 'Errors',   color: '#ef4444' },
            { count: lintIssues.filter(i => i.type === 'warning').length, label: 'Warnings', color: '#eab308' },
            { count: lintIssues.filter(i => i.type === 'info').length,    label: 'Notes',    color: '#6366f1' },
          ].map(({ count, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: count === 0 && label === 'Errors' ? '#10b981' : color, lineHeight: 1 }}>{count}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
