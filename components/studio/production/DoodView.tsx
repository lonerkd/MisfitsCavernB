'use client';

import React, { useMemo } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { Calendar } from 'lucide-react';
import { useStudio } from '../StudioContext';
import { castByScene } from '@/lib/film/cast';
import { useCharacters, useSceneCharacters } from '@/lib/studio';
import s from '../studio.module.css';

type DoodStatus = 'W' | 'H' | 'T' | 'R' | '-';

export function DoodView() {
  const { project, scenes } = useStudio();
  const storyChars = useCharacters(project.id);
  const sceneLinks = useSceneCharacters(project.id);
  const castByScn = useMemo(() => castByScene(sceneLinks.rows, storyChars.rows), [sceneLinks.rows, storyChars.rows]);

  // Unique shoot days sorted
  const days = useMemo(() => {
    const set = new Set<number>();
    for (const sc of scenes.rows) if (sc.shoot_day != null) set.add(sc.shoot_day);
    return Array.from(set).sort((a, b) => a - b);
  }, [scenes.rows]);

  // Characters sorted by first appearance
  const chars = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const sc of [...scenes.rows].sort((a, b) => (a.shoot_day ?? 999) - (b.shoot_day ?? 999))) {
      const cast = castByScn.get(sc.id) ?? [];
      for (const name of cast) {
        if (!seen.has(name)) { seen.add(name); out.push(name); }
      }
    }
    return out;
  }, [scenes.rows, castByScn]);

  // For each character × day: W (work), H (hold), T (travel), - (none)
  const statusOf = useMemo(() => {
    const m = new Map<string, Map<number, DoodStatus>>();
    for (const c of chars) m.set(c, new Map());
    for (const sc of scenes.rows) {
      if (sc.shoot_day == null) continue;
      const cast = castByScn.get(sc.id) ?? [];
      for (const name of cast) {
        m.get(name)?.set(sc.shoot_day, 'W');
      }
    }
    // Fill hold days: days between first and last work day with no scene
    for (const c of chars) {
      const dayMap = m.get(c)!;
      const workDays = [...dayMap.entries()].filter(([, v]) => v === 'W').map(([d]) => d).sort((a, b) => a - b);
      if (workDays.length < 2) continue;
      const first = workDays[0];
      const last = workDays[workDays.length - 1];
      for (const d of days) {
        if (d > first && d < last && !dayMap.has(d)) dayMap.set(d, 'H');
      }
    }
    return m;
  }, [chars, scenes.rows, castByScn, days]);

  if (days.length === 0 || chars.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="No schedule yet"
        subtitle="Day out of days appears once scenes are scheduled to shoot days."
      />
    );
  }

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 1100, overflowX: 'auto' }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Calendar size={14} /> Day out of days
          <span className={s.hint}> · {chars.length} cast · {days.length} shoot days</span>
        </div>
        <div className={s.row} style={{ gap: 8, fontSize: 11 }}>
          <span><b>W</b> work</span>
          <span><b>H</b> hold</span>
          <span><b>T</b> travel</span>
          <span><b>-</b> off</span>
        </div>
      </div>

      <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>Cast</th>
            {days.map((d) => (
              <th key={d} style={{ padding: '6px 4px', borderBottom: '1px solid var(--border)', textAlign: 'center', minWidth: 28 }}>D{d}</th>
            ))}
            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Days</th>
          </tr>
        </thead>
        <tbody>
          {chars.map((c) => {
            const dayMap = statusOf.get(c) ?? new Map();
            const workDays = Array.from(dayMap.values()).filter((v) => v === 'W').length;
            return (
              <tr key={c}>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{c}</td>
                {days.map((d) => {
                  const st = dayMap.get(d) ?? '-';
                  const bg = st === 'W' ? 'var(--accent, #6366f1)' : st === 'H' ? 'var(--warn, #fbbf24)' : st === 'T' ? 'var(--info, #60a5fa)' : 'transparent';
                  const color = st === 'W' || st === 'H' || st === 'T' ? '#fff' : 'var(--muted-foreground)';
                  return (
                    <td key={d} style={{ padding: '6px 4px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: 22, height: 22, lineHeight: '22px', borderRadius: 4, background: bg, color, fontWeight: 600 }}>{st}</span>
                    </td>
                  );
                })}
                <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{workDays}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
