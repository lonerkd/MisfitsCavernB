'use client';

import React from 'react';
import { Plus, FileUp, Book } from 'lucide-react';
import type { ScriptLine } from '@/types/screenplay';
import type { StoredScript } from '@/lib/scriptos/storage';

/* =========================================================================
   ScriptOS editor — the left navigator (script controls, templates, and the
   proportional Story Map scene list), extracted from the editor page.
   Pure presentation: state, handlers and the textarea ref are passed in, so
   behaviour matches the inline version it replaced (a cut-and-thread).
   ========================================================================= */

export interface EditorLeftNavProps {
  scripts: StoredScript[];
  setScripts: React.Dispatch<React.SetStateAction<StoredScript[]>>;
  createNewScript: (title: string) => Promise<StoredScript | null>;
  setCurrentScript: (s: StoredScript) => void;
  setContent: (v: string) => void;
  toast: (msg: string, kind?: any) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showTitleEditor: boolean;
  setShowTitleEditor: (v: boolean) => void;
  templates: Record<string, string>;
  scenesList: ScriptLine[];
  sceneWordCounts: number[];
  currentSceneIdx: number;
  sceneTypeColor: (scene: ScriptLine) => string;
  getSceneType: (scene: ScriptLine) => { isInt: boolean; isExt: boolean; isDay: boolean; isNight: boolean };
  sceneCharMap: string[][];
  actStructure: { act2Start: number; act3Start: number; [k: string]: number };
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  setCursorLine: (n: number) => void;
}

export function EditorLeftNav({
  scripts, setScripts, createNewScript, setCurrentScript, setContent, toast,
  fileInputRef, handleImportFile, showTitleEditor, setShowTitleEditor, templates: TEMPLATES,
  scenesList, sceneWordCounts, currentSceneIdx, sceneTypeColor, getSceneType,
  sceneCharMap, actStructure, textareaRef, content, setCursorLine,
}: EditorLeftNavProps) {
  return (
    <>
              {/* Script Controls */}
              <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={async () => {
                  const s = await createNewScript('Untitled Script');
                  if (s) {
                    setScripts([...scripts, s]);
                    setCurrentScript(s);
                    setContent('');
                    toast('New script created', 'success');
                  } else {
                    toast('Could not create script — check your connection', 'error');
                  }
                }} style={{
                  width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  padding: '8px 12px', borderRadius: 9, color: 'var(--fg-muted)',
                  fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--fg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                >
                  <Plus size={12} /> New Script
                </button>

                <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                  {[
                    { icon: FileUp, label: 'Import', onClick: () => fileInputRef.current?.click() },
                    { icon: Book,   label: 'Title',  onClick: () => setShowTitleEditor(!showTitleEditor) },
                  ].map(({ icon: Icon, label, onClick }) => (
                    <button key={label} onClick={onClick} style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.06)',
                      padding: '6px', borderRadius: 7,
                      color: 'var(--fg-dim)', fontFamily: 'var(--mono)', fontSize: 8.5,
                      letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--fg-dim)'; }}
                    >
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>

                <input ref={fileInputRef} type="file" accept=".fountain,.txt,.fdx,.pdf" onChange={handleImportFile} style={{ display: 'none' }} />

                {/* Templates */}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 3, marginTop: 14, marginBottom: 7 }}>Templates</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.keys(TEMPLATES).filter(k => k !== 'blank').map(key => (
                    <button key={key} onClick={async () => {
                      const s = await createNewScript(key.charAt(0).toUpperCase() + key.slice(1));
                      if (s) {
                        setScripts(prev => [...prev, s]);
                        setCurrentScript(s);
                        setContent(TEMPLATES[key]);
                        toast(`Created from "${key}" template`, 'success');
                      } else {
                        toast('Could not create script', 'error');
                      }
                    }} style={{
                      fontSize: 8, padding: '4px 9px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 6, color: 'var(--fg-dim)',
                      cursor: 'pointer', textTransform: 'capitalize',
                      fontFamily: 'var(--mono)', letterSpacing: 1,
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,60,0,0.3)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--fg-dim)'; }}
                    >{key}</button>
                  ))}
                </div>
              </div>

              {/* STORY MAP — proportional scene navigator */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 20px' }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)',
                  textTransform: 'uppercase', letterSpacing: 3, marginBottom: 10, paddingLeft: 4,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Story Map</span>
                  <span style={{ opacity: 0.5 }}>{scenesList.length} sc</span>
                </div>

                {scenesList.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--fg-dim)', fontFamily: 'var(--serif)', fontStyle: 'italic', padding: '8px 4px' }}>
                    Start writing to see your story map.
                  </div>
                )}

                {(() => {
                  const maxWc = Math.max(...sceneWordCounts, 1);
                  return scenesList.map((scene, i) => {
                    const isActive = i === currentSceneIdx;
                    const wc = sceneWordCounts[i] || 0;
                    const barPct = Math.max(8, Math.round((wc / maxWc) * 100));
                    const color = sceneTypeColor(scene);
                    const { isInt, isExt, isDay, isNight } = getSceneType(scene);
                    const chars = sceneCharMap[i] || [];
                    const typeLabel = `${isInt ? 'I' : isExt ? 'E' : '?'}/${isDay ? 'D' : isNight ? 'N' : '?'}`;

                    // Act boundary lines
                    const isAct2Start = i + 1 === actStructure.act2Start && scenesList.length > 2;
                    const isAct3Start = i + 1 === actStructure.act3Start && scenesList.length > 2;

                    return (
                      <React.Fragment key={scene.id}>
                        {(isAct2Start || isAct3Start) && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            margin: '6px 0 4px', paddingLeft: 4,
                          }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)', letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0 }}>
                              Act {isAct2Start ? 'II' : 'III'}
                            </span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                          </div>
                        )}

                        <button
                          onClick={() => {
                            const textarea = textareaRef.current;
                            if (!textarea) return;
                            const sceneText = scene.text;
                            const idx = content.toUpperCase().indexOf(sceneText.toUpperCase());
                            if (idx >= 0) {
                              textarea.focus();
                              textarea.setSelectionRange(idx, idx);
                              const linesBefore = content.substring(0, idx).split('\n').length;
                              setCursorLine(linesBefore);
                            }
                          }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '8px 4px 8px 8px',
                            marginBottom: 2, background: 'transparent',
                            border: 'none', borderRadius: 8, cursor: 'pointer',
                            borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
                            transition: 'border-color 0.25s, background 0.18s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Scene header row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 8, color: color,
                              flexShrink: 0, opacity: 0.8,
                            }}>{typeLabel}</span>
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 9,
                              color: isActive ? 'var(--fg)' : 'rgba(240,236,228,0.6)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              textTransform: 'uppercase', flex: 1,
                            }}>
                              {scene.text.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')}
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)', flexShrink: 0 }}>
                              {wc > 0 ? `${wc}w` : ''}
                            </span>
                          </div>

                          {/* Word count bar */}
                          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginBottom: 5, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${barPct}%`,
                              background: isActive ? color : `${color}88`,
                              borderRadius: 1, transition: 'width 0.4s',
                            }} />
                          </div>

                          {/* Character dots */}
                          {chars.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {chars.slice(0, 4).map(c => (
                                <span key={c} style={{
                                  fontFamily: 'var(--mono)', fontSize: 7,
                                  color: 'var(--fg-dim)', background: 'rgba(255,255,255,0.05)',
                                  padding: '1px 5px', borderRadius: 3,
                                  overflow: 'hidden', maxWidth: 56,
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {c.split(' ')[0]}
                                </span>
                              ))}
                              {chars.length > 4 && (
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 7, color: 'var(--fg-dim)' }}>+{chars.length - 4}</span>
                              )}
                            </div>
                          )}
                        </button>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
    </>
  );
}
