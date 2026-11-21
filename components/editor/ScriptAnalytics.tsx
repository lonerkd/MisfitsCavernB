'use client';

import React from 'react';
import { TimingPanel } from './TimingPanel';
import { formatRuntime, type CharacterTiming, type ScriptTiming } from '@/lib/scriptos/timing';
import type { ScriptLine } from '@/lib/scriptos/types';
import type { CharacterStats } from '@/lib/scriptos/characters';
import type { LintIssue } from '@/lib/scriptos/validator';
import { ScriptKnowledgePanel } from './ScriptKnowledgePanel';
import type { ScriptKnowledge } from '@/lib/scriptos/knowledge';
import { CARD_COLORS, getSceneType, sceneTypeColor } from '@/lib/scriptos/sceneVisuals';

/**
 * The script's analytics, in the editor's right rail (Script section): the
 * numbers, runtime, scene timeline, who is in which scene, dialogue against
 * action, the scene table and the script's health. It was the centre
 * "Stats" view; it lives beside the script so it can be read while writing.
 */
export function ScriptAnalytics({
  currentScriptTitle, wordCount, pageEst, scenesList, uniqueLocations, chars,
  charStats, dialogueRatio, sceneWordCounts, actStructure, sceneCharMap,
  currentSceneIdx, lintIssues, timing, characterTiming, onJumpToScene, onReadFromScene, targetMinutes, briefHref, knowledge,
}: {
  /** What the reader has learned about the script: languages, years, layers, places. */
  knowledge?: ScriptKnowledge;
  timing: ScriptTiming;
  targetMinutes?: number | null;
  briefHref?: string;
  characterTiming: CharacterTiming[];
  onJumpToScene: (sceneIdx: number) => void;
  onReadFromScene: (sceneIdx: number) => void;
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
    <div data-testid="script-analytics" style={{ width: '100%', minWidth: 0 }}>
      {currentScriptTitle && <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', marginBottom: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentScriptTitle}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 28 }}>
        {[
          { label: 'Words',   value: wordCount.toLocaleString(), color: 'var(--violet)', sub: `${pageEst} pages` },
          { label: 'Runtime', value: formatRuntime(timing.runtime), color: 'var(--ok)', sub: timing.readScenes ? `${timing.readScenes} scenes timed` : 'a minute a page' },
          { label: 'Scenes',  value: `${scenesList.length}`, color: 'var(--accent)', sub: `${uniqueLocations.length} locations` },
          { label: 'Cast',    value: `${chars.length}`, color: 'var(--warn)', sub: `${charStats[0]?.name ?? '—'} leads` },
          { label: 'Balance', value: `${dialogueRatio}%`, color: 'var(--jobs-text)', sub: 'dialogue' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px', transition: 'border-color 0.3s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '40'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {knowledge && <ScriptKnowledgePanel knowledge={knowledge} />}

      <TimingPanel timing={timing} characters={characterTiming} currentSceneIdx={currentSceneIdx} onJump={onJumpToScene} onRead={onReadFromScene} targetMinutes={targetMinutes} briefHref={briefHref} />

      {scenesList.length > 0 && (() => {
        const totalWc = sceneWordCounts.reduce((a, b) => a + b, 0) || 1;
        const { act1End, act2End } = actStructure;
        return (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 14 }}>Scene Timeline</div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              {[
                { label: 'INT/Day', color: 'var(--violet)' }, { label: 'INT/Night', color: 'var(--violet)' },
                { label: 'EXT/Day', color: 'var(--warn)' }, { label: 'EXT/Night', color: 'color-mix(in srgb, var(--warn) 45%, var(--bg))' },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)' }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', height: 32, borderRadius: 8, overflow: 'hidden', gap: 1, background: 'var(--bg-3)', padding: 4 }}>
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
                      borderRadius: 4, cursor: 'pointer', opacity: 0.85,
                      minWidth: 4, position: 'relative',
                      transition: 'opacity 0.15s, transform 0.15s',
                      border: i === currentSceneIdx ? '1px solid rgba(var(--ink-rgb), 0.6)' : 'none',
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
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', whiteSpace: 'nowrap' }}>{label}</span>
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
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)'}}>{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {charStats.length > 0 && scenesList.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 14 }}>Character Presence</div>
          <div role="region" aria-label="Character presence by scene" tabIndex={0} style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: Math.max(400, scenesList.length * 22) }}>
              {charStats.slice(0, 8).map((cs, ci) => {
                const charColor = CARD_COLORS[ci % CARD_COLORS.length];
                return (
                  <div key={cs.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 76, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, color: charColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
                              flex: 1, height: 14, borderRadius: 4, minWidth: 8,
                              background: appearsHere ? charColor : 'rgba(var(--ink-rgb), 0.04)',
                              opacity: appearsHere ? 0.85 : 1,
                              transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => { if (appearsHere) e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={e => { if (appearsHere) e.currentTarget.style.opacity = '0.85'; }}
                          />
                        );
                      })}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', flexShrink: 0, width: 30, textAlign: 'right' }}>
                      {cs.scenesIn.length}sc
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 2, marginLeft: 84 }}>
                {scenesList.map((_, si) => (
                  <div key={si} style={{ flex: 1, minWidth: 8 }}>
                    {(si + 1) % Math.max(1, Math.floor(scenesList.length / 8)) === 0 && (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', textAlign: 'center' }}>{si + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 14 }}>Dialogue vs Action</div>
        <div style={{ display: 'flex', gap: 1, borderRadius: 8, overflow: 'hidden', height: 20 }}>
          <div style={{ width: `${dialogueRatio}%`, background: 'var(--violet)', transition: 'width 0.5s', minWidth: dialogueRatio > 0 ? 2 : 0 }} />
          <div style={{ flex: 1, background: 'var(--accent)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--violet)' }}>{dialogueRatio}% Dialogue</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--accent)' }}>{100 - dialogueRatio}% Action</span>
        </div>
      </div>

      {scenesList.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 14 }}>Scene Breakdown</div>
          <div role="region" aria-label="Scene breakdown" tabIndex={0} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto' }}><div style={{ minWidth: 300 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px 52px 60px 52px', gap: 0, padding: '8px 14px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)' }}>
              {['#', 'Scene', 'Type', 'Cast', 'Words', 'Time'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' }}>{h}</div>
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
                    borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{i + 1}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8, textTransform: 'var(--caps)' }}>
                    {scene.text.replace(/^(INT\.|EXT\.|INT\/EXT\.)\s*/i, '')}
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color, background: `${color}18`, padding: '1px 5px', borderRadius: 4 }}>
                      {isInt?'INT':isExt?'EXT':'?'}/{isDay?'D':isNight?'N':'?'}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{sceneCast.length}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>{wc.toLocaleString()}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{timeStr}</div>
                </div>
              );
            })}
          </div></div>
        </div>
      )}

      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-dim)', marginBottom: 12 }}>Script Health</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { count: lintIssues.filter(i => i.type === 'error').length,   label: 'Errors',   color: 'var(--danger)' },
            { count: lintIssues.filter(i => i.type === 'warning').length, label: 'Warnings', color: 'var(--warn)' },
            { count: lintIssues.filter(i => i.type === 'info').length,    label: 'Notes',    color: 'var(--violet)' },
          ].map(({ count, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: count === 0 && label === 'Errors' ? 'var(--ok)' : color, lineHeight: 1 }}>{count}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
