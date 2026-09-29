'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Check, Flame, Minus, Pause, Pencil, Play, Plus, RotateCcw, Target, X } from 'lucide-react';
import type { WritingLoop } from '@/lib/writing';

type Toast = (msg: string, kind?: 'success' | 'error' | 'info') => void;

/** A timed sprint that counts the words typed during it and logs itself when it ends. */
export function useSprint(loop: WritingLoop, toast: Toast) {
  const [active, setActive] = useState(false);
  const [left, setLeft] = useState(loop.sprintMinutes * 60);
  const [words, setWords] = useState(0);
  const started = useRef(false);

  // A new length applies when no sprint is under way.
  useEffect(() => { if (!started.current) setLeft(loop.sprintMinutes * 60); }, [loop.sprintMinutes]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setLeft((t) => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const finished = useRef(false);
  useEffect(() => {
    if (!active || left > 0 || finished.current) return;
    finished.current = true;
    setActive(false);
    started.current = false;
    toast(`Sprint done — ${words} word${words === 1 ? '' : 's'}`, 'success');
    void loop.flush(true);
  }, [active, left, words, loop, toast]);

  const start = useCallback(() => {
    if (!started.current) { setWords(0); setLeft(loop.sprintMinutes * 60); finished.current = false; started.current = true; }
    setActive(true);
  }, [loop.sprintMinutes]);
  const pause = useCallback(() => setActive(false), []);
  const reset = useCallback(() => { setActive(false); started.current = false; setWords(0); setLeft(loop.sprintMinutes * 60); }, [loop.sprintMinutes]);
  const onType = useCallback((n: number) => { if (active) setWords((w) => w + n); }, [active]);

  return { active, left, words, running: started.current, start, pause, reset, onType };
}
export type Sprint = ReturnType<typeof useSprint>;

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const card: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.05)', padding: 12, borderRadius: 8 };
const title: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--fg-strong)', display: 'flex', alignItems: 'center', gap: 6 };
const iconBtn: React.CSSProperties = { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'none', color: 'var(--fg)', cursor: 'pointer' };

/**
 * Today's words against the goal, the streak and the last four weeks, the
 * sprint, and what the writing has earned — all from the writer's real days.
 */
export function WritingLoopPanel({ loop, sprint, toast }: { loop: WritingLoop; sprint: Sprint; toast: Toast }) {
  const { summary: s } = loop;
  const pct = Math.min(100, Math.round((s.today.words / Math.max(1, s.today.goal)) * 100));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(loop.goal));
  const earned = loop.badges.filter((b) => b.earned);
  const metDays = s.recent.filter((d) => d.met).length;

  const saveGoal = async () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n) || n < 50 || n > 20000) { toast('A daily goal is between 50 and 20,000 words', 'error'); return; }
    try { await loop.setGoal(n); setEditing(false); } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the goal', 'error'); }
  };
  const setMinutes = async (n: number) => {
    try { await loop.setSprintMinutes(Math.min(120, Math.max(5, n))); } catch (e) { toast(e instanceof Error ? e.message : 'Could not save the sprint length', 'error'); }
  };

  return (
    <section aria-label="Writing loop" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={card}>
        <div style={{ ...title, justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={14} /> Today</span>
          {!editing && (
            <button type="button" style={iconBtn} aria-label="Change the daily goal" onClick={() => { setDraft(String(loop.goal)); setEditing(true); }}><Pencil size={11} /></button>
          )}
        </div>
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); void saveGoal(); }} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label htmlFor="daily-goal" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Daily goal</label>
            <input id="daily-goal" type="number" min={50} max={20000} step={50} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
              style={{ width: 90, background: 'var(--sunken)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 8, color: 'var(--fg)', padding: '4px 6px', fontFamily: 'var(--mono)' }} />
            <button type="submit" style={iconBtn} aria-label="Save the goal"><Check size={12} /></button>
            <button type="button" style={iconBtn} aria-label="Cancel" onClick={() => setEditing(false)}><X size={12} /></button>
          </form>
        ) : (
          <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <strong style={{ fontSize: 26, fontFamily: 'var(--mono)', color: pct >= 100 ? 'var(--ok)' : 'var(--fg-strong)' }}>{s.today.words.toLocaleString()}</strong>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>/ {s.today.goal.toLocaleString()} words typed today</span>
          </p>
        )}
        <div role="progressbar" aria-label="Progress toward today’s goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
          style={{ height: 4, background: 'rgba(var(--ink-rgb), 0.1)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#34c77b' : '#0099ff', transition: 'width 0.5s' }} />
        </div>
      </div>

      <div style={card}>
        <div style={{ ...title, justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={14} color={s.streak ? '#ff7a45' : undefined} /> {s.streak ? `${s.streak}-day streak` : 'No streak yet'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>best {s.best}</span>
        </div>
        <div role="img" aria-label={`Last four weeks: goal met on ${metDays} day${metDays === 1 ? '' : 's'}`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {s.recent.map((d, i) => (
            <div key={d.day} title={`${d.day}: ${d.words} words`}
              style={{
                aspectRatio: '1', borderRadius: 4,
                background: d.met ? '#34c77b' : d.words > 0 ? 'rgba(52,199,123,0.3)' : 'rgba(var(--ink-rgb), 0.05)',
                outline: i === s.recent.length - 1 ? '1px solid rgba(var(--ink-rgb), 0.5)' : undefined,
              }} />
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ ...title, justifyContent: 'space-between', marginBottom: 8 }}>
          <span>Sprint</span>
          <span style={{ display: 'flex', gap: 4 }}>
            <button type="button" style={{ ...iconBtn, color: sprint.active ? 'var(--accent)' : '#0099ff' }} aria-label={sprint.active ? 'Pause sprint' : 'Start sprint'}
              onClick={sprint.active ? sprint.pause : sprint.start}>{sprint.active ? <Pause size={13} /> : <Play size={13} />}</button>
            <button type="button" style={iconBtn} aria-label="Reset sprint" onClick={sprint.reset} disabled={!sprint.running && !sprint.active}><RotateCcw size={12} /></button>
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mono)', color: sprint.active ? 'var(--fg-strong)' : 'var(--fg-muted)', textAlign: 'center' }} aria-live="off">{mmss(sprint.left)}</div>
        {sprint.running || sprint.active ? (
          <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>{sprint.words} word{sprint.words === 1 ? '' : 's'} this sprint</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}>
            <button type="button" style={iconBtn} aria-label="Shorter sprint" onClick={() => void setMinutes(loop.sprintMinutes - 5)} disabled={loop.sprintMinutes <= 5}><Minus size={12} /></button>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', minWidth: 52, textAlign: 'center' }}>{loop.sprintMinutes} min</span>
            <button type="button" style={iconBtn} aria-label="Longer sprint" onClick={() => void setMinutes(loop.sprintMinutes + 5)} disabled={loop.sprintMinutes >= 120}><Plus size={12} /></button>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ ...title, marginBottom: 8 }}><Award size={14} /> Earned · {earned.length}/{loop.badges.length}</div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {loop.badges.map((b) => (
            <li key={b.id} title={b.hint}
              style={{ fontSize: 11, fontFamily: 'var(--mono)', padding: '3px 8px', borderRadius: 9999, border: `1px solid ${b.earned ? 'rgba(52,199,123,0.5)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: b.earned ? '#5fd99a' : 'var(--fg-muted)' }}>
              {b.earned ? '✓ ' : ''}{b.label}<span className="sr-only">{b.earned ? ' — earned' : ` — ${b.hint}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
