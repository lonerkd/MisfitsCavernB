'use client';

import React, { useState } from 'react';
import { Wand2, History, AlertCircle, Bookmark, ClipboardList, Target, Pause, Play, Settings, Tags, BarChart3, ChevronDown, ChevronRight, Music, Lightbulb } from 'lucide-react';
import type { ScriptLine } from '@/types/screenplay';
import { REVISION_COLORS, type Revision } from '@/lib/scriptos/revisions';
import type { CharacterStats } from '@/lib/scriptos/characters';

const CHARACTER_COLOR = '#ffaa00';

/* =========================================================================
   ScriptOS editor — the tabbed right-sidebar panels.

   Regrouped from the seven legacy tabs (tools / characters / revisions /
   lint / stash / breakdown / audio) into four grouped tabs that mirror the
   Cavern Suite redesign:

     • Write    — the writing surface tools (quick insert, sprint, goal,
                  view options, detected elements)
     • Insights — collapsible Breakdown, Character Report and Validation
                  sections (analysis that used to be three separate tabs)
     • History  — Revisions and the Stash, side by side
     • Audio    — project audio references (previously a dead tab)

   The type scale was also lifted off the 7–9px floor to a legible 11–14px.
   Still pure presentation: every piece of state, every handler and the
   textarea ref are passed in as props. The only local state is the
   ephemeral open/closed flags for the collapsible Insights/History sections.
   ========================================================================= */

export type RightPanelTab = 'write' | 'insights' | 'history' | 'audio';

export interface EditorRightPanelsProps {
  rightPanel: RightPanelTab;
  setRightPanel: (p: RightPanelTab) => void;
  activeView: string;
  currentSceneIdx: number;
  scenesList: ScriptLine[];
  getSceneType: (scene: ScriptLine) => { isInt: boolean; isExt: boolean; isDay: boolean; isNight: boolean };
  sceneTypeColor: (scene: ScriptLine) => string;
  sceneWordCounts: number[];
  sceneCharMap: string[][];
  insertElement: (type: string) => void;
  sprintActive: boolean;
  setSprintActive: (v: boolean) => void;
  sprintTime: number;
  wordCount: number;
  dailyGoal: number;
  goalProgress: number;
  pageEst: number;
  dialogueRatio: number;
  typewriterMode: boolean;
  setTypewriterMode: (v: boolean) => void;
  nightModePreview: boolean;
  setNightModePreview: (v: boolean) => void;
  elements: Record<string, string[]>;
  chars: string[];
  charStats: CharacterStats[];
  handleLockRevision: () => void;
  revisions: Revision[];
  setContent: (v: string) => void;
  toast: (msg: string, kind?: any) => void;
  showSceneNumbers: boolean;
  setShowSceneNumbers: (v: boolean) => void;
  showWatermark: boolean;
  setShowWatermark: (v: boolean) => void;
  lintIssues: { type: string; message: string; rule?: string; line?: number }[];
  stashItems: { id: string; text: string; date: number }[];
  setStashItems: React.Dispatch<React.SetStateAction<{ id: string; text: string; date: number }[]>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  currentScript: { title?: string, id?: string } | null;
  projectAudioRefs?: any[];
  playAudioRef?: (ref: any) => void;
}

/* A collapsible section header used inside the Insights and History tabs. */
function SectionHeader({
  icon: Icon, label, count, color = 'var(--fg)', open, onToggle, right,
}: {
  icon: React.ComponentType<{ size?: number | string }>;
  label: string;
  count?: number | null;
  color?: string;
  open: boolean;
  onToggle: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', padding: '10px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
        userSelect: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.045)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#fff' }}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Icon size={14} />
        <span>{label}</span>
        {count != null && (
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color, background: `${color}1a`, padding: '1px 7px', borderRadius: 99 }}>{count}</span>
        )}
      </div>
      {right}
    </div>
  );
}

export function EditorRightPanels({
  rightPanel, setRightPanel, activeView, currentSceneIdx, scenesList,
  getSceneType, sceneTypeColor, sceneWordCounts, sceneCharMap, insertElement,
  sprintActive, setSprintActive, sprintTime, wordCount, dailyGoal, goalProgress,
  pageEst, dialogueRatio, typewriterMode, setTypewriterMode, nightModePreview,
  setNightModePreview, elements, chars, charStats, handleLockRevision, revisions,
  setContent, toast, showSceneNumbers, setShowSceneNumbers, showWatermark,
  setShowWatermark, lintIssues, stashItems, setStashItems, textareaRef, currentScript, projectAudioRefs = [], playAudioRef,
}: EditorRightPanelsProps) {
  const TYPE_COLORS = { character: CHARACTER_COLOR };

  // Ephemeral open/closed flags for the collapsible sections.
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [charsOpen, setCharsOpen] = useState(false);
  const [lintOpen, setLintOpen] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(true);
  const [stashOpen, setStashOpen] = useState(false);

  const errorCount = lintIssues.filter(i => i.type === 'error').length;
  const warnCount = lintIssues.filter(i => i.type === 'warning').length;

  const TABS: [RightPanelTab, React.ComponentType<{ size?: number | string }>, string][] = [
    ['write', Wand2, 'Write'],
    ['insights', Lightbulb, 'Insights'],
    ['history', History, 'History'],
    ['audio', Music, 'Audio'],
  ];

  return (
    <>
              {/* Panel Tabs — labelled pill group */}
              <div style={{ padding: '10px 8px 0', display: 'flex', gap: 2, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {TABS.map(([key, Icon, label]) => (
                  <button key={key} onClick={() => setRightPanel(key)} style={{
                    flex: 1, padding: '8px 0', background: 'transparent', border: 'none',
                    borderBottom: rightPanel === key ? '2px solid var(--accent)' : '2px solid transparent',
                    color: rightPanel === key ? 'var(--fg)' : 'var(--fg-dim)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                  onMouseEnter={e => { if (rightPanel !== key) e.currentTarget.style.color = 'var(--fg-muted)'; }}
                  onMouseLeave={e => { if (rightPanel !== key) e.currentTarget.style.color = 'var(--fg-dim)'; }}
                  >
                    <Icon size={15} />
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
                  </button>
                ))}
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 22, flex: 1, overflowY: 'auto' }}>
                {/* ============================= WRITE ============================= */}
                {rightPanel === 'write' && (
                  <>
                    {/* ── CURRENT SCENE CONTEXT ── */}
                    {activeView === 'write' && currentSceneIdx >= 0 && scenesList[currentSceneIdx] && (() => {
                      const scene = scenesList[currentSceneIdx];
                      const { isInt, isExt, isDay, isNight } = getSceneType(scene);
                      const color = sceneTypeColor(scene);
                      const wc = sceneWordCounts[currentSceneIdx] || 0;
                      const chars = sceneCharMap[currentSceneIdx] || [];
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
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: color, marginBottom: 8, opacity: 0.85 }}>
                            Now Writing · Scene {currentSceneIdx + 1}
                          </div>
                          <div style={{
                            fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--fg)',
                            textTransform: 'uppercase', marginBottom: 10,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {scene.text.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: chars.length ? 10 : 0 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: color, background: `${color}18`, padding: '2px 8px', borderRadius: 4 }}>{typeTag}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>{wc}w · {estTime}</span>
                          </div>
                          {chars.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {chars.slice(0, 5).map(c => (
                                <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: 4 }}>{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Quick Insert */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>
                        <Wand2 size={14} /> Quick Insert
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {['scene', 'action', 'character', 'dialogue', 'transition', 'note'].map(type => (
                          <button key={type} onClick={() => insertElement(type)} style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--fg)', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>{type}</button>
                        ))}
                      </div>
                    </div>
                    {/* Sprint Timer */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Sprint</div>
                        <button onClick={() => setSprintActive(!sprintActive)} style={{ background: 'transparent', border: 'none', color: sprintActive ? '#d7340b' : '#0099ff', cursor: 'pointer' }}>{sprintActive ? <Pause size={14} /> : <Play size={14} />}</button>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: sprintActive ? '#fff' : 'var(--fg-muted)', textAlign: 'center' }}>{Math.floor(sprintTime / 60).toString().padStart(2, '0')}:{(sprintTime % 60).toString().padStart(2, '0')}</div>
                    </div>
                    {/* Goal Tracker */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}><span>Daily Goal</span><span style={{ color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{wordCount} / {dailyGoal}</span></div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', width: `${goalProgress}%`, background: goalProgress >= 100 ? '#00cc66' : '#0099ff', transition: 'width 0.5s' }} /></div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    {/* View Options */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={14} /> View Options</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                          <span>Typewriter Mode</span>
                          <input type="checkbox" checked={typewriterMode} onChange={e => setTypewriterMode(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                          <span>Dark Mode (Preview)</span>
                          <input type="checkbox" checked={nightModePreview} onChange={e => setNightModePreview(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                        </label>
                      </div>
                    </div>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    {/* Detected Elements */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Tags size={14} /> Elements</div>
                      {Object.keys(elements).length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic' }}>No elements detected yet.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {Object.entries(elements).map(([category, items]) => (
                            <div key={category}>
                              <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{category}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {items.map(item => (<span key={item} style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: 4, color: '#fff' }}>{item}</span>))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ============================ INSIGHTS =========================== */}
                {rightPanel === 'insights' && (
                  <>
                    {/* ── Breakdown section ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <SectionHeader icon={ClipboardList} label="Breakdown" open={breakdownOpen} onToggle={() => setBreakdownOpen(o => !o)} />
                      {breakdownOpen && (
                        <>
                          {/* Analytics summary */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, padding: '0 4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Scenes</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{scenesList.length}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Characters</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{chars.length}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Est. Runtime</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>~{Math.ceil(pageEst * 0.8)} min</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Pages</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{pageEst}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Words</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{wordCount.toLocaleString()}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}><span>Dialogue/Action</span><span style={{ color: '#fff', fontFamily: 'var(--mono)' }}>{dialogueRatio}% / {100 - dialogueRatio}%</span></div>
                          </div>
                          {/* Production element tags, derived from detected elements */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontStyle: 'italic' }}>Production elements per scene.</div>
                            <button className="link-btn" style={{ fontSize: 11 }} onClick={() => {
                              const entries = Object.entries(elements).filter(([, items]) => (items as string[]).length > 0);
                              if (entries.length === 0) { toast('No tagged elements to export yet', 'info'); return; }
                              const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
                              const w = window.open('', '_blank', 'width=820,height=1080');
                              if (!w) return;
                              w.document.write(`<!doctype html><html><head><title>${esc(currentScript?.title || 'Script')} — Breakdown</title>
                                <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px}h1{font-size:20px;letter-spacing:2px}
                                h2{font-size:11px;letter-spacing:2px;color:#b45309;border-bottom:1px solid #ddd;padding-bottom:4px;margin:20px 0 8px;text-transform:uppercase}
                                .chip{display:inline-block;font-size:12px;padding:3px 9px;background:#f3f3f5;border:1px solid #ddd;border-radius:99px;margin:0 6px 6px 0}</style></head><body>
                                <h1>${esc(currentScript?.title || 'SCRIPT')} — BREAKDOWN</h1>
                                ${entries.map(([cat, items]) => `<h2>${esc(cat)} (${(items as string[]).length})</h2>${(items as string[]).map(i => `<span class="chip">${esc(i)}</span>`).join('')}`).join('')}
                                <script>window.onload=()=>window.print()</script></body></html>`);
                              w.document.close();
                            }}>⎙ Export</button>
                          </div>
                          {Object.keys(elements).length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic', padding: '4px' }}>No production elements detected yet. Tag elements in your script to populate the breakdown.</div>
                          ) : (
                            Object.entries(elements).map(([category, items]) => (
                              <div key={category} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                  {category}
                                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--fg-muted)' }}>{items.length}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {items.map(item => (
                                    <span key={item} style={{ fontSize: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(215,52,11,0.28)', padding: '4px 10px', borderRadius: 4, color: '#fff' }}>{item}</span>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>

                    {/* ── Character Report section ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <SectionHeader icon={BarChart3} label="Character Report" count={charStats.length || null} color={CHARACTER_COLOR} open={charsOpen} onToggle={() => setCharsOpen(o => !o)} />
                      {charsOpen && (
                        charStats.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic', padding: '0 4px' }}>No characters detected yet.</div>
                        ) : (
                          charStats.slice(0, 15).map((cs) => (
                            <div key={cs.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS.character }}>{cs.name}</span>
                                <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{cs.dialoguePercentage}%</span>
                              </div>
                              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 8 }}>
                                <div style={{ height: '100%', width: `${cs.dialoguePercentage}%`, background: TYPE_COLORS.character, borderRadius: 2 }} />
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--fg-muted)' }}>
                                <span>{cs.dialogueLines} lines</span>
                                <span>{cs.dialogueWords} words</span>
                                <span>{cs.scenesIn.length} scenes</span>
                                <span>~{cs.avgWordsPerLine} w/line</span>
                              </div>
                              {Object.keys(cs.speaksTo).length > 0 && (
                                <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>Shares scenes with: {Object.entries(cs.speaksTo).sort((a,b) => b[1]-a[1]).slice(0,3).map(([name]) => name).join(', ')}</div>
                              )}
                            </div>
                          ))
                        )
                      )}
                    </div>

                    {/* ── Validation section ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <SectionHeader
                        icon={AlertCircle}
                        label="Validation"
                        count={lintIssues.length || null}
                        color={errorCount > 0 ? '#ef4444' : warnCount > 0 ? '#eab308' : '#00cc66'}
                        open={lintOpen}
                        onToggle={() => setLintOpen(o => !o)}
                      />
                      {lintOpen && (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                              <span>Scene Numbers</span>
                              <input type="checkbox" checked={showSceneNumbers} onChange={e => setShowSceneNumbers(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                              <span>DRAFT Watermark</span>
                              <input type="checkbox" checked={showWatermark} onChange={e => setShowWatermark(e.target.checked)} style={{ accentColor: '#0099ff' }} />
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{errorCount} errors</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>{warnCount} warnings</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{lintIssues.filter(i => i.type === 'info').length} info</span>
                          </div>
                          {lintIssues.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#00cc66', fontStyle: 'italic', textAlign: 'center', padding: 16 }}>✓ No issues found. Script formatting looks great!</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {lintIssues.slice(0, 30).map((issue, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '8px 10px', borderLeft: `2px solid ${issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#eab308' : '#3b82f6'}` }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#eab308' : '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>{issue.type}</span>
                                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>L{issue.line}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: '#ccc' }}>{issue.message}</div>
                                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'var(--mono)' }}>{issue.rule}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* ============================ HISTORY ============================ */}
                {rightPanel === 'history' && (
                  <>
                    {/* ── Revisions section ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <SectionHeader
                        icon={History}
                        label="Revisions"
                        count={revisions.length || null}
                        open={revisionsOpen}
                        onToggle={() => setRevisionsOpen(o => !o)}
                        right={(
                          <button onClick={(e) => { e.stopPropagation(); handleLockRevision(); }} style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px', color: '#fff', cursor: 'pointer' }}>Lock Current</button>
                        )}
                      />
                      {revisionsOpen && (
                        revisions.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontStyle: 'italic', padding: '0 4px' }}>No revisions locked yet. Lock your first draft to start tracking changes.</div>
                        ) : (
                          revisions.map((rev) => {
                            const revColor = REVISION_COLORS[rev.colorIndex];
                            return (
                              <div key={rev.id} style={{ background: revColor.bg, border: `1px solid ${revColor.color}33`, borderRadius: 8, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: revColor.color }}>{rev.label}</span>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: revColor.color }} />
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(rev.date).toLocaleString()}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{rev.snapshot.split('\n').length} lines · {rev.snapshot.split(/\s+/).filter(Boolean).length} words</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${revColor.color}22` }}>
                                  <button
                                    onClick={() => { setContent(rev.snapshot); toast(`Restored to ${rev.label}`, 'success'); }}
                                    style={{ fontSize: 11, background: 'transparent', border: 'none', color: revColor.color, cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={() => { alert("Snapshot Content:\n\n" + rev.snapshot.substring(0, 1000) + "..."); }}
                                    style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}
                    </div>

                    {/* ── Stash section ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <SectionHeader
                        icon={Bookmark}
                        label="The Stash"
                        count={stashItems.length || null}
                        open={stashOpen}
                        onToggle={() => setStashOpen(o => !o)}
                        right={(
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const sel = textareaRef.current?.value.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd);
                            if (sel) {
                              setStashItems(prev => [{ id: Math.random().toString(), text: sel, date: Date.now() }, ...prev]);
                              toast('Added to stash', 'success');
                            } else {
                              toast('Select text to stash', 'error');
                            }
                          }} style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', border: 'none', padding: '4px 8px', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>+ Add Selected</button>
                        )}
                      />
                      {stashOpen && (
                        <>
                          <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4, padding: '0 4px' }}>Save snippets, alt dialogue, or cut scenes here for later use.</div>
                          {stashItems.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>Stash is empty.<br/><br/>Select text in the editor and click &quot;+ Add Selected&quot; to save it here.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {stashItems.map(item => (
                                <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '10px' }}>
                                  <div style={{ fontSize: 12, color: '#ccc', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{new Date(item.date).toLocaleDateString()}</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button onClick={() => {
                                        if (textareaRef.current) {
                                          const val = textareaRef.current.value;
                                          const start = textareaRef.current.selectionStart;
                                          const end = textareaRef.current.selectionEnd;
                                          setContent(val.substring(0, start) + item.text + val.substring(end));
                                          toast('Inserted from stash', 'success');
                                        }
                                      }} style={{ fontSize: 11, background: 'transparent', border: 'none', color: '#0099ff', cursor: 'pointer', padding: 0 }}>Insert</button>
                                      <button onClick={() => setStashItems(prev => prev.filter(i => i.id !== item.id))} style={{ fontSize: 11, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>Delete</button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* ============================= AUDIO ============================= */}
                {rightPanel === 'audio' && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><Music size={14} /> Project Audio</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4 }}>Reference tracks and sound design linked to this project.</div>
                    {projectAudioRefs.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No audio references yet.<br/><br/>Link tracks from the Soundtrack module or upload sound design to populate this panel.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {projectAudioRefs.map((ref: any) => (
                          <div key={ref.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              onClick={() => playAudioRef?.(ref)}
                              disabled={!playAudioRef}
                              title="Play"
                              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: playAudioRef ? 'pointer' : 'default' }}
                            >
                              <Play size={13} />
                            </button>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ref.title || ref.name || ref.uri || 'Untitled track'}</div>
                              <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                {ref.reference_type === 'spotify' ? 'Spotify' : ref.reference_type === 'custom_upload' ? 'Upload' : (ref.reference_type || 'audio')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
    </>
  );
}
