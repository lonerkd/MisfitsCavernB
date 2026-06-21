'use client';

/* =========================================================================
   SCRIPTOS — RIGHT SIDEBAR (TABBED PANELS)
   Tools, Characters, Revisions, Lint, Stash and Breakdown panels used to
   live inline in app/editor/page.tsx. Pulled out here so the page
   component only owns state/orchestration.
   ========================================================================= */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Users, History, AlertCircle, Bookmark, ClipboardList,
  Target, Play, Pause, Settings, Tags, BarChart3, Pencil, Merge, Check, X as XIcon,
} from 'lucide-react';
import type { ScriptLine } from '@/types/screenplay';
import type { CharacterStats } from '@/lib/scriptos/characters';
import type { Revision } from '@/lib/scriptos/revisions';
import { REVISION_COLORS } from '@/lib/scriptos/revisions';
import type { LintIssue } from '@/lib/scriptos/validator';

export type RightPanelKey = 'tools' | 'characters' | 'revisions' | 'lint' | 'stash' | 'breakdown';

export interface StashItem { id: string; text: string; date: number }
export interface BreakdownGroup { category: string; items: string[]; color: string }

const PANEL_TABS: readonly (readonly [RightPanelKey, any])[] = [
  ['tools', Wand2], ['characters', Users], ['revisions', History],
  ['lint', AlertCircle], ['stash', Bookmark], ['breakdown', ClipboardList],
];

export function EditorSidePanels({
  show, focusMode, rightPanel, onRightPanelChange,
  activeView, currentSceneIdx, scenesList, getSceneType, sceneTypeColor, sceneWordCounts, sceneCharMap, insertElement,
  sprintActive, onToggleSprint, sprintTime,
  wordCount, dailyGoal, goalProgress, chars, dialogueRatio, pageEst,
  typewriterMode, onTypewriterModeChange, nightModePreview, onNightModePreviewChange,
  elements, typeColors,
  charStats, onRenameCharacter,
  revisions, onLockRevision, onRestoreRevision, onViewDiff,
  showSceneNumbers, onShowSceneNumbersChange, showWatermark, onShowWatermarkChange, lintIssues, onJumpToLine,
  stashItems, onAddStashFromSelection, onInsertStash, onDeleteStash,
  breakdownGroups, manualBreakdown, onAddBreakdownItem, onRemoveBreakdownItem, uniqueLocations,
}: {
  show: boolean;
  focusMode: boolean;
  rightPanel: RightPanelKey;
  onRightPanelChange: (key: RightPanelKey) => void;
  activeView: string;
  currentSceneIdx: number;
  scenesList: ScriptLine[];
  getSceneType: (scene: ScriptLine) => { isInt: boolean; isExt: boolean; isDay: boolean; isNight: boolean };
  sceneTypeColor: (scene: ScriptLine) => string;
  sceneWordCounts: number[];
  sceneCharMap: string[][];
  insertElement: (type: string) => void;
  sprintActive: boolean;
  onToggleSprint: () => void;
  sprintTime: number;
  wordCount: number;
  dailyGoal: number;
  goalProgress: number;
  chars: string[];
  dialogueRatio: number;
  pageEst: number;
  typewriterMode: boolean;
  onTypewriterModeChange: (v: boolean) => void;
  nightModePreview: boolean;
  onNightModePreviewChange: (v: boolean) => void;
  elements: Record<string, string[]>;
  typeColors: Record<string, string>;
  charStats: CharacterStats[];
  onRenameCharacter: (oldName: string, newName: string) => void;
  revisions: Revision[];
  onLockRevision: () => void;
  onRestoreRevision: (snapshot: string, label: string) => void;
  onViewDiff: (revisionId: string) => void;
  showSceneNumbers: boolean;
  onShowSceneNumbersChange: (v: boolean) => void;
  showWatermark: boolean;
  onShowWatermarkChange: (v: boolean) => void;
  lintIssues: LintIssue[];
  onJumpToLine: (lineIndex: number) => void;
  stashItems: StashItem[];
  onAddStashFromSelection: () => void;
  onInsertStash: (text: string) => void;
  onDeleteStash: (id: string) => void;
  breakdownGroups: BreakdownGroup[];
  manualBreakdown: Record<string, string[]>;
  onAddBreakdownItem: (category: string, item: string) => void;
  onRemoveBreakdownItem: (category: string, item: string) => void;
  uniqueLocations: [string, number][];
}) {
  const [editingChar, setEditingChar] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [mergingChar, setMergingChar] = React.useState<string | null>(null);
  const [newBreakdownItem, setNewBreakdownItem] = React.useState('');
  const [newBreakdownCategory, setNewBreakdownCategory] = React.useState('PROPS');

  return (
    <AnimatePresence>
      {show && !focusMode && (
        <motion.div
          initial={{ x: 272, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 272, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: 272, background: 'rgba(4,7,13,0.96)', borderLeft: '1px solid rgba(224,221,174,0.05)', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
        >
          {/* Panel Tabs — pill group */}
          <div style={{ padding: '10px 10px 0', display: 'flex', gap: 2, flexShrink: 0, borderBottom: '1px solid rgba(224,221,174,0.05)' }}>
            {PANEL_TABS.map(([key, Icon]) => (
              <button key={key} onClick={() => onRightPanelChange(key)} style={{
                flex: 1, padding: '7px 0', background: 'transparent', border: 'none',
                borderBottom: rightPanel === key ? '2px solid var(--accent)' : '2px solid transparent',
                color: rightPanel === key ? 'var(--fg)' : 'var(--fg-dim)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { if (rightPanel !== key) e.currentTarget.style.color = 'var(--fg-muted)'; }}
              onMouseLeave={e => { if (rightPanel !== key) e.currentTarget.style.color = 'var(--fg-dim)'; }}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>

          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 22, flex: 1, overflowY: 'auto' }}>
            {/* TOOLS PANEL */}
            {rightPanel === 'tools' && (
              <>
                {/* ── CURRENT SCENE CONTEXT ── */}
                {activeView === 'write' && currentSceneIdx >= 0 && scenesList[currentSceneIdx] && (() => {
                  const scene = scenesList[currentSceneIdx];
                  const { isInt, isExt, isDay, isNight } = getSceneType(scene);
                  const color = sceneTypeColor(scene);
                  const wc = sceneWordCounts[currentSceneIdx] || 0;
                  const sceneChars = sceneCharMap[currentSceneIdx] || [];
                  const estSecs = Math.max(1, Math.round(wc / 185 * 60));
                  const estTime = estSecs >= 60 ? `${Math.floor(estSecs/60)}m ${estSecs%60}s` : `${estSecs}s`;
                  const typeTag = `${isInt?'INT':isExt?'EXT':'?'} · ${isDay?'DAY':isNight?'NIGHT':'?'}`;
                  return (
                    <div style={{
                      background: `${color}0d`,
                      border: `1px solid ${color}28`,
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 3, textTransform: 'uppercase', color: color, marginBottom: 7, opacity: 0.85 }}>
                        Now Writing · Scene {currentSceneIdx + 1}
                      </div>
                      <div style={{
                        fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--fg)',
                        textTransform: 'uppercase', marginBottom: 10,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {scene.text.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: sceneChars.length ? 10 : 0 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: color, background: `${color}18`, padding: '2px 7px', borderRadius: 4 }}>{typeTag}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>{wc}w · {estTime}</span>
                      </div>
                      {sceneChars.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {sceneChars.slice(0, 5).map(c => (
                            <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.08)', padding: '2px 6px', borderRadius: 4 }}>{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Quick Insert */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                    <Wand2 size={14} /> Quick Insert
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {['scene', 'action', 'character', 'dialogue', 'transition', 'note'].map(type => (
                      <button key={type} onClick={() => insertElement(type)} style={{ padding: '8px', background: 'rgba(224,221,174,0.03)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 6, color: 'var(--fg)', fontSize: 11, fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,221,174,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,221,174,0.03)'}>{type}</button>
                    ))}
                  </div>
                </div>
                {/* Sprint Timer */}
                <div style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Sprint</div>
                    <button onClick={onToggleSprint} style={{ background: 'transparent', border: 'none', color: sprintActive ? '#d7340b' : '#336467', cursor: 'pointer' }}>{sprintActive ? <Pause size={14} /> : <Play size={14} />}</button>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: sprintActive ? '#fff' : 'var(--fg-muted)', textAlign: 'center' }}>{Math.floor(sprintTime / 60).toString().padStart(2, '0')}:{(sprintTime % 60).toString().padStart(2, '0')}</div>
                </div>
                {/* Goal Tracker */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8 }}><span>Daily Goal</span><span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{wordCount} / {dailyGoal}</span></div>
                  <div style={{ height: 4, background: 'rgba(224,221,174,0.1)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${goalProgress}%`, background: goalProgress >= 100 ? '#00cc66' : '#336467', transition: 'width 0.5s' }} /></div>
                </div>
                <div style={{ height: 1, background: 'rgba(224,221,174,0.05)' }} />
                {/* Breakdown Analytics */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Scenes</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{scenesList.length}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Characters</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{chars.length}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Est. Runtime</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>~{Math.ceil(pageEst * 0.8)} min</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Pages</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{pageEst}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Words</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{wordCount.toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Dialogue/Action</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{dialogueRatio}% / {100 - dialogueRatio}%</span></div>
                  </div>
                </div>
                {/* View Options */}
                <div style={{ height: 1, background: 'rgba(224,221,174,0.05)' }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={14} /> View Options</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                      <span>Typewriter Mode</span>
                      <input type="checkbox" checked={typewriterMode} onChange={e => onTypewriterModeChange(e.target.checked)} style={{ accentColor: '#336467' }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                      <span>Dark Mode (Preview)</span>
                      <input type="checkbox" checked={nightModePreview} onChange={e => onNightModePreviewChange(e.target.checked)} style={{ accentColor: '#336467' }} />
                    </label>
                  </div>
                </div>
                <div style={{ height: 1, background: 'rgba(224,221,174,0.05)' }} />
                {/* Breakdown Tags */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Tags size={14} /> Elements</div>
                  {Object.keys(elements).length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No elements detected yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {Object.entries(elements).map(([category, items]) => (
                        <div key={category}>
                          <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{category}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {items.map(item => (<span key={item} style={{ fontSize: 9, background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>{item}</span>))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* CHARACTER STATS PANEL */}
            {rightPanel === 'characters' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Character Report</div>
                {charStats.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No characters detected yet.</div>
                ) : (
                  charStats.slice(0, 15).map((cs) => (
                    <div key={cs.name} style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                        {editingChar === cs.name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                            <input
                              autoFocus
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { onRenameCharacter(cs.name, editingValue.trim()); setEditingChar(null); }
                                if (e.key === 'Escape') setEditingChar(null);
                              }}
                              style={{ flex: 1, background: 'rgba(224,221,174,0.06)', border: '1px solid var(--accent)', borderRadius: 4, padding: '3px 6px', color: '#fff', fontSize: 11, outline: 'none' }}
                            />
                            <button onClick={() => { onRenameCharacter(cs.name, editingValue.trim()); setEditingChar(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--secondary)', cursor: 'pointer', padding: 2 }}><Check size={12} /></button>
                            <button onClick={() => setEditingChar(null)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 2 }}><XIcon size={12} /></button>
                          </div>
                        ) : mergingChar === cs.name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                            <select
                              autoFocus
                              defaultValue=""
                              onChange={e => { if (e.target.value) { onRenameCharacter(cs.name, e.target.value); setMergingChar(null); } }}
                              style={{ flex: 1, background: 'rgba(224,221,174,0.06)', border: '1px solid var(--secondary)', borderRadius: 4, padding: '3px 6px', color: '#fff', fontSize: 11, outline: 'none' }}
                            >
                              <option value="" disabled>Merge into…</option>
                              {charStats.filter(o => o.name !== cs.name).map(o => (
                                <option key={o.name} value={o.name}>{o.name}</option>
                              ))}
                            </select>
                            <button onClick={() => setMergingChar(null)} style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 2 }}><XIcon size={12} /></button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontSize: 12, fontWeight: 700, color: typeColors.character, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cs.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <button onClick={() => { setEditingChar(cs.name); setEditingValue(cs.name); }} title="Rename everywhere" style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 2, display: 'flex' }}><Pencil size={11} /></button>
                              {charStats.length > 1 && (
                                <button onClick={() => setMergingChar(cs.name)} title="Merge into another character" style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 2, display: 'flex' }}><Merge size={11} /></button>
                              )}
                              <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{cs.dialoguePercentage}%</span>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Dialogue bar */}
                      <div style={{ height: 3, background: 'rgba(224,221,174,0.1)', borderRadius: 2, marginBottom: 8 }}>
                        <div style={{ height: '100%', width: `${cs.dialoguePercentage}%`, background: typeColors.character, borderRadius: 2 }} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, color: 'var(--fg-muted)' }}>
                        <span>{cs.dialogueLines} line{cs.dialogueLines === 1 ? '' : 's'}</span>
                        <span>{cs.dialogueWords} word{cs.dialogueWords === 1 ? '' : 's'}</span>
                        <span>{cs.scenesIn.length} scene{cs.scenesIn.length === 1 ? '' : 's'}</span>
                        <span>~{cs.avgWordsPerLine} w/line</span>
                      </div>
                      {/* Top relationships — proportional co-occurrence bars */}
                      {Object.keys(cs.speaksTo).length > 0 && (() => {
                        const top = Object.entries(cs.speaksTo).sort((a, b) => b[1] - a[1]).slice(0, 4);
                        const max = top[0][1];
                        return (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(224,221,174,0.05)' }}>
                            <div style={{ fontSize: 9, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Shares Scenes With</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {top.map(([name, count]) => (
                                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 10, color: '#ccc', width: 64, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                  <div style={{ flex: 1, height: 3, background: 'rgba(224,221,174,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.round((count / max) * 100)}%`, background: '#6366f1', borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </>
            )}

            {/* REVISION HISTORY PANEL */}
            {rightPanel === 'revisions' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><History size={14} /> Revisions</div>
                  <button onClick={onLockRevision} style={{ fontSize: 10, background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 4, padding: '4px 8px', color: '#fff', cursor: 'pointer' }}>Lock Current</button>
                </div>
                {revisions.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No revisions locked yet. Lock your first draft to start tracking changes.</div>
                ) : (
                  revisions.map((rev) => {
                    const revColor = REVISION_COLORS[rev.colorIndex];
                    return (
                      <div key={rev.id} style={{ background: revColor.bg, border: `1px solid ${revColor.color}33`, borderRadius: 8, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: revColor.color }}>{rev.label}</span>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: revColor.color }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{new Date(rev.date).toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{(() => { const l = rev.snapshot.split('\n').length; const w = rev.snapshot.split(/\s+/).filter(Boolean).length; return `${l} line${l === 1 ? '' : 's'} · ${w} word${w === 1 ? '' : 's'}`; })()}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${revColor.color}22` }}>
                          <button
                            onClick={() => onRestoreRevision(rev.snapshot, rev.label)}
                            style={{ fontSize: 9, background: 'transparent', border: 'none', color: revColor.color, cursor: 'pointer', fontWeight: 600 }}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => onViewDiff(rev.id)}
                            style={{ fontSize: 9, background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
                          >
                            Diff vs Current
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* LINT / VALIDATION PANEL */}
            {rightPanel === 'lint' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> Script Validation</div>
                {/* Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                    <span>Scene Numbers</span>
                    <input type="checkbox" checked={showSceneNumbers} onChange={e => onShowSceneNumbersChange(e.target.checked)} style={{ accentColor: '#336467' }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                    <span>DRAFT Watermark</span>
                    <input type="checkbox" checked={showWatermark} onChange={e => onShowWatermarkChange(e.target.checked)} style={{ accentColor: '#336467' }} />
                  </label>
                </div>
                <div style={{ height: 1, background: 'rgba(224,221,174,0.05)' }} />
                {/* Issue summary */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{lintIssues.filter(i => i.type === 'error').length} errors</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>{lintIssues.filter(i => i.type === 'warning').length} warnings</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{lintIssues.filter(i => i.type === 'info').length} info</span>
                </div>
                {lintIssues.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#00cc66', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>✓ No issues found. Script formatting looks great!</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lintIssues.slice(0, 30).map((issue, idx) => (
                      <div
                        key={idx}
                        onClick={() => onJumpToLine(issue.line)}
                        title="Click to jump to this line in the script"
                        style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 6, padding: '8px 10px', borderLeft: `2px solid ${issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#eab308' : '#3b82f6'}`, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(224,221,174,0.07)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(224,221,174,0.02)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#eab308' : '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>{issue.type}</span>
                          <span style={{ fontSize: 9, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>L{issue.line} →</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#ccc' }}>{issue.message}</div>
                        <div style={{ fontSize: 9, color: '#666', marginTop: 2, fontFamily: 'var(--mono)' }}>{issue.rule}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* THE STASH PANEL */}
            {rightPanel === 'stash' && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Bookmark size={14} /> The Stash</div>
                  <button onClick={onAddStashFromSelection} style={{ fontSize: 9, background: 'rgba(224,221,174,0.05)', border: 'none', padding: '4px 8px', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>+ Add Selected</button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--fg-muted)', marginBottom: 12, lineHeight: 1.4 }}>Save snippets, alt dialogue, or cut scenes here for later use.</div>

                {stashItems.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>Stash is empty.<br/><br/>Select text in the editor and click "+ Add Selected" to save it here.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stashItems.map(item => (
                      <div key={item.id} style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 6, padding: '10px' }}>
                        <div style={{ fontSize: 11, color: '#ccc', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(224,221,174,0.05)' }}>
                          <span style={{ fontSize: 9, color: 'var(--fg-muted)' }}>{new Date(item.date).toLocaleDateString()}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onInsertStash(item.text)} style={{ fontSize: 9, background: 'transparent', border: 'none', color: '#336467', cursor: 'pointer', padding: 0 }}>Insert</button>
                            <button onClick={() => onDeleteStash(item.id)} style={{ fontSize: 9, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* BREAKDOWN PANEL — real elements detected by the parser, not placeholder data */}
            {rightPanel === 'breakdown' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} /> Script Breakdown</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic', marginBottom: 4 }}>Auto-detected, plus anything you tag by hand.</div>

                {/* Manual tag form — covers what the auto-detector misses (a one-off prop
                    only mentioned in dialogue, etc.) */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={newBreakdownCategory}
                    onChange={e => setNewBreakdownCategory(e.target.value)}
                    style={{ background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 4, padding: '6px 6px', color: '#fff', fontSize: 10, outline: 'none' }}
                  >
                    {['PROPS', 'WARDROBE', 'VEHICLES', 'VFX', 'SFX'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    value={newBreakdownItem}
                    onChange={e => setNewBreakdownItem(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newBreakdownItem.trim()) {
                        onAddBreakdownItem(newBreakdownCategory, newBreakdownItem.trim());
                        setNewBreakdownItem('');
                      }
                    }}
                    placeholder="Tag an item…"
                    style={{ flex: 1, background: 'rgba(224,221,174,0.05)', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 4, padding: '6px 8px', color: '#fff', fontSize: 11, outline: 'none' }}
                  />
                  <button
                    onClick={() => { if (newBreakdownItem.trim()) { onAddBreakdownItem(newBreakdownCategory, newBreakdownItem.trim()); setNewBreakdownItem(''); } }}
                    style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 4, padding: '6px 10px', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >+</button>
                </div>

                {breakdownGroups.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No props, wardrobe, vehicles, VFX or SFX tagged yet.</div>
                ) : (
                  breakdownGroups.map(group => (
                    <div key={group.category} style={{ background: 'rgba(224,221,174,0.02)', border: '1px solid rgba(224,221,174,0.05)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        {group.category}
                        <span style={{ opacity: 0.6, fontWeight: 500 }}>{group.items.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {group.items.map(item => {
                          const isManual = (manualBreakdown[group.category] || []).includes(item);
                          return (
                            <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, background: 'rgba(224,221,174,0.03)', border: `1px solid ${group.color}33`, padding: '4px 10px', borderRadius: 4, color: '#fff' }}>
                              {item}
                              {isManual && (
                                <button onClick={() => onRemoveBreakdownItem(group.category, item)} title="Remove" style={{ background: 'transparent', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', padding: 0, display: 'flex' }}><XIcon size={9} /></button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                <div style={{ height: 1, background: 'rgba(224,221,174,0.05)' }} />

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Locations ({uniqueLocations.length})</div>
                  {uniqueLocations.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>No scene headings yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {uniqueLocations.slice(0, 12).map(([loc, count]) => (
                        <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-muted)' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{loc}</span>
                          <span style={{ fontFamily: 'var(--mono)', color: '#fff', flexShrink: 0 }}>{count}×</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
