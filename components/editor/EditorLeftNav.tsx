'use client';

import React from 'react';
import { Plus, FileUp, Book } from 'lucide-react';
import type { ScriptLine } from '@/types/screenplay';
import type { StoredScript } from '@/lib/scriptos/storage';

export interface EditorLeftNavProps {
  scripts: StoredScript[];
  setScripts: React.Dispatch<React.SetStateAction<StoredScript[]>>;
  createNewScript: (title: string, initialContent?: string) => Promise<StoredScript | null>;
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
  jumpToScene: (sceneIndex: number) => void;
  reorderScenes: (from: number, to: number) => void;
  dragSceneIdx: number | null;
  setDragSceneIdx: (i: number | null) => void;
  dropSceneIdx: number | null;
  setDropSceneIdx: (i: number | null) => void;
}

export function EditorLeftNav({
  scripts, setScripts, createNewScript, setCurrentScript, setContent, toast,
  fileInputRef, handleImportFile, showTitleEditor, setShowTitleEditor, templates: TEMPLATES,
  scenesList, sceneWordCounts, currentSceneIdx, sceneTypeColor, getSceneType,
  sceneCharMap, actStructure,
  jumpToScene, reorderScenes, dragSceneIdx, setDragSceneIdx, dropSceneIdx, setDropSceneIdx,
}: EditorLeftNavProps) {
  return (
    <>
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

                <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 3, marginTop: 14, marginBottom: 7 }}>Templates</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.keys(TEMPLATES).filter(k => k !== 'blank').map(key => (
                    <button key={key} onClick={async () => {
                      const s = await createNewScript(key.charAt(0).toUpperCase() + key.slice(1), TEMPLATES[key]);
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
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(215, 52, 11,0.3)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--fg-dim)'; }}
                    >{key}</button>
                  ))}
                </div>
              </div>

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
                          onClick={() => jumpToScene(i)}
                          draggable
                          title="Drag to reorder · click to jump to this scene"
                          onDragStart={e => { setDragSceneIdx(i); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={e => { e.preventDefault(); if (dropSceneIdx !== i) setDropSceneIdx(i); }}
                          onDragEnd={() => { setDragSceneIdx(null); setDropSceneIdx(null); }}
                          onDrop={e => { e.preventDefault(); if (dragSceneIdx !== null && dragSceneIdx !== i) reorderScenes(dragSceneIdx, i); setDragSceneIdx(null); setDropSceneIdx(null); }}
                          style={{
                            width: '100%', textAlign: 'left', padding: '10px',
                            marginBottom: 4,
                            background: isActive ? 'rgba(255,255,255,0.04)' : dropSceneIdx === i && dragSceneIdx !== null && dragSceneIdx !== i ? 'rgba(255,255,255,0.05)' : 'transparent',
                            border: '1px solid',
                            borderColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            borderRadius: 10, cursor: 'grab',
                            borderLeft: `3px solid ${isActive ? color : dropSceneIdx === i && dragSceneIdx !== i ? color : 'transparent'}`,
                            boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                            opacity: dragSceneIdx === i ? 0.4 : 1,
                            transition: 'border-color 0.25s, background 0.18s, opacity 0.2s, box-shadow 0.2s',
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 9, color: color,
                              flexShrink: 0, opacity: 0.9, fontWeight: 600
                            }}>{typeLabel}</span>
                            <span style={{
                              fontFamily: 'var(--mono)', fontSize: 10.5,
                              color: isActive ? 'var(--fg)' : 'rgba(224, 221, 174,0.7)',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              textTransform: 'uppercase', flex: 1, letterSpacing: 0.5
                            }}>
                              {scene.text.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')}
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)', flexShrink: 0, opacity: 0.8 }}>
                              {wc > 0 ? `${wc}w` : ''}
                            </span>
                          </div>

                          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1.5, marginBottom: 8, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${barPct}%`,
                              background: isActive ? color : `${color}88`,
                              borderRadius: 1.5, transition: 'width 0.4s',
                              boxShadow: isActive ? `0 0 6px ${color}` : 'none'
                            }} />
                          </div>

                          {chars.length > 0 && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {chars.slice(0, 4).map(c => (
                                <span key={c} style={{
                                  fontFamily: 'var(--mono)', fontSize: 8,
                                  color: isActive ? 'var(--fg)' : 'var(--fg-dim)', background: 'rgba(255,255,255,0.05)',
                                  padding: '2px 6px', borderRadius: 4,
                                  overflow: 'hidden', maxWidth: 65,
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  border: '1px solid rgba(255,255,255,0.03)'
                                }}>
                                  {c.split(' ')[0]}
                                </span>
                              ))}
                              {chars.length > 4 && (
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)' }}>+{chars.length - 4}</span>
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
