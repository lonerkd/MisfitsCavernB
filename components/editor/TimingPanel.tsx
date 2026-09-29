'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { formatEighths, formatRuntime, type CharacterTiming, type ScriptTiming } from '@/lib/scriptos/timing';

const head: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 12px', fontWeight: 400 };
const cell: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid rgba(var(--fg-rgb), 0.06)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg)', textAlign: 'right', whiteSpace: 'nowrap' };
const th: React.CSSProperties = { ...cell, fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-muted)', fontWeight: 400 };

/**
 * Runtime from the script's printed length (lib/scriptos/timing), per scene,
 * calibrated by what the table read measured; and who speaks how much.
 */
export function TimingPanel({ timing, characters, currentSceneIdx, onJump, onRead, targetMinutes, briefHref }: {
  timing: ScriptTiming;
  /** The length the project's brief aims for, if it says. */
  targetMinutes?: number | null;
  briefHref?: string;
  characters: CharacterTiming[];
  currentSceneIdx: number;
  onJump: (sceneIdx: number) => void;
  /** Start a table read from a scene's heading. */
  onRead: (sceneIdx: number) => void;
}) {
  const max = Math.max(1, ...timing.scenes.map((s) => s.runtime));
  const drift = timing.readScenes ? Math.round((timing.calibration - 1) * 100) : 0;

  return (
    <section aria-labelledby="timing-title" style={{ marginBottom: 40 }}>
      <h2 id="timing-title" style={head}>Runtime</h2>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--fg)' }}>{formatRuntime(timing.runtime)}</strong> from {timing.pages.toFixed(1)} printed pages
        {timing.readScenes
          ? <> · {timing.readScenes} scene{timing.readScenes === 1 ? '' : 's'} timed at a table read, reading {Math.abs(drift)}% {drift >= 0 ? 'longer' : 'shorter'} than a minute a page — the rest are scaled to match.</>
          : <> at about a minute a page. Run a table read to time scenes for real.</>}
      </p>
      {targetMinutes ? (() => {
        const ratio = timing.runtime / (targetMinutes * 60);
        const off = Math.round(Math.abs(ratio - 1) * 100);
        const color = ratio > 1.15 || ratio < 0.85 ? 'var(--warn)' : '#34c77b';
        return (
          <p style={{ margin: '-6px 0 14px', fontSize: 12, color: 'var(--fg-muted)' }}>
            <span style={{ color }}>●</span> The brief aims for <strong style={{ color: 'var(--fg)' }}>{targetMinutes} min</strong>
            {off < 3 ? ' — right on it.' : ` — ${off}% ${ratio > 1 ? 'over' : 'under'}.`}
            {briefHref && <> <a href={briefHref} style={{ color: 'var(--fg-muted)' }}>Change it</a></>}
          </p>
        );
      })() : briefHref ? (
        <p style={{ margin: '-6px 0 14px', fontSize: 12, color: 'var(--fg-muted)' }}>
          <a href={briefHref} style={{ color: 'var(--fg-muted)' }}>Set a target length in the project brief</a> to measure the script against it.
        </p>
      ) : null}

      {timing.scenes.length > 0 && (
        <div role="img" aria-label={`Scene lengths: ${timing.scenes.length} scenes, longest ${formatRuntime(max)}`}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, padding: 4, borderRadius: 8, background: 'rgba(var(--fg-rgb), 0.03)', marginBottom: 14 }}>
          {timing.scenes.map((s) => (
            <div key={s.index} title={`${s.index + 1}. ${s.heading} · ${formatRuntime(s.runtime)}${s.read ? ' (read)' : ''}`}
              style={{
                flex: `${Math.max(0.6, s.runtime)} 1 0`, minWidth: 3, borderRadius: 2,
                height: `${Math.max(12, (s.runtime / max) * 100)}%`,
                background: s.read ? '#34c77b' : `rgba(129,140,248,${0.35 + 0.5 * s.dialogueShare})`,
                outline: s.index === currentSceneIdx ? '1px solid rgba(var(--ink-rgb), 0.7)' : undefined,
              }} />
          ))}
        </div>
      )}

      {timing.scenes.length > 0 && (
        <div style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 8, border: '1px solid rgba(var(--fg-rgb), 0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="sr-only">Runtime by scene</caption>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-3, #0d1019)' }}>
              <tr>
                <th scope="col" style={{ ...th, textAlign: 'left' }}>Scene</th>
                <th scope="col" style={th}>Length</th>
                <th scope="col" style={th}>Estimate</th>
                <th scope="col" style={th}>Read</th>
                <th scope="col" style={th}>Runtime</th>
                <th scope="col" style={th}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {timing.scenes.map((s) => (
                <tr key={s.index} aria-current={s.index === currentSceneIdx ? 'location' : undefined}
                  style={{ background: s.index === currentSceneIdx ? 'rgba(232,67,26,0.08)' : undefined }}>
                  <td style={{ ...cell, textAlign: 'left', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <button type="button" onClick={() => onJump(s.index)}
                      style={{ background: 'none', border: 'none', padding: '4px 0', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', textAlign: 'left', minHeight: 24 }}>
                      {s.index + 1}. {s.heading}
                    </button>
                  </td>
                  <td style={cell}>{formatEighths(s.eighths)}</td>
                  <td style={{ ...cell, color: 'var(--fg-muted)' }}>{formatRuntime(s.estimate)}</td>
                  <td style={{ ...cell, color: s.read ? '#5fd99a' : 'var(--fg-muted)' }}>{s.read ? formatRuntime(s.read) : '—'}</td>
                  <td style={cell}>{formatRuntime(s.runtime)}</td>
                  <td style={cell}>
                    <button type="button" onClick={() => onRead(s.index)} aria-label={`Table read from scene ${s.index + 1}`} title="Table read from here"
                      style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid rgba(var(--fg-rgb), 0.14)', background: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>
                      <Play size={11} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {characters.length > 0 && (
        <>
          <h2 style={{ ...head, marginTop: 28 }}>Who speaks</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <caption className="sr-only">Dialogue by character</caption>
            <thead>
              <tr>
                <th scope="col" style={{ ...th, textAlign: 'left' }}>Character</th>
                <th scope="col" style={th}>Speeches</th>
                <th scope="col" style={th}>Words</th>
                <th scope="col" style={th}>Scenes</th>
                <th scope="col" style={th}>Talk time</th>
                <th scope="col" style={th}>First seen</th>
              </tr>
            </thead>
            <tbody>
              {characters.slice(0, 20).map((c) => (
                <tr key={c.name}>
                  <th scope="row" style={{ ...cell, textAlign: 'left', fontWeight: 500 }}>{c.name}</th>
                  <td style={cell}>{c.speeches}</td>
                  <td style={cell}>{c.words.toLocaleString()}</td>
                  <td style={cell}>{c.scenes}</td>
                  <td style={cell}>{formatRuntime(c.talkTime)}</td>
                  <td style={cell}>Scene {c.firstScene + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
