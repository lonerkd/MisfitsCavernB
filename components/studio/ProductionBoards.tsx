'use client';

import React, { useState } from 'react';
import { readable } from '@/lib/color';

export function Stripboard({ scenes }: { scenes: any[] }) {
  const [view, setView] = useState<'strips' | 'dood'>('strips');

  const stripColor = (s: any) => {
    const head = `${s.title || ''} ${s.location || ''}`.toUpperCase();
    const isExt = /\bEXT\b/.test(head) || (!/\bINT\b/.test(head) && false);
    const tod = String(s.time_of_day || 'DAY').toUpperCase();
    const isNight = tod === 'NIGHT' || tod === 'DUSK' || tod === 'EVENING';
    if (isExt && isNight) return { bg: 'rgba(16,185,129,0.16)', bar: '#10b981', label: 'EXT · NIGHT' };
    if (isExt) return { bg: 'rgba(245,158,11,0.16)', bar: '#f59e0b', label: 'EXT · DAY' };
    if (isNight) return { bg: 'rgba(59,130,246,0.16)', bar: '#3b82f6', label: 'INT · NIGHT' };
    return { bg: 'rgba(255,255,255,0.05)', bar: '#8f8d78', label: 'INT · DAY' };
  };
  const eighths = (s: any) => { const m = String(s.est_duration || '').match(/(\d+)\/8/); return m ? Number(m[1]) : 1; };

  const days = Array.from(new Set(scenes.map(s => s.shoot_day || 1))).sort((a, b) => a - b);

  const castRows = (() => {
    const map: Record<string, Set<number>> = {};
    scenes.forEach(s => {
      const day = s.shoot_day || 1;
      String(s.cast_list || '').split(',').map((c: string) => c.trim()).filter(Boolean).forEach(name => {
        (map[name.toUpperCase()] ||= new Set()).add(day);
      });
    });
    return Object.entries(map).map(([name, set]) => {
      const dset = set as Set<number>;
      const worked = Array.from(dset).sort((a, b) => a - b);
      const start = worked[0]; const finish = worked[worked.length - 1];

      const cells = days.map(d => {
        if (!dset.has(d)) return d > start && d < finish ? 'H' : '·';
        if (d === start && d === finish) return 'SF';
        if (d === start) return 'S';
        if (d === finish) return 'F';
        return 'W';
      });
      const total = worked.length;
      return { name, cells, total };
    }).sort((a, b) => b.total - a.total);
  })();

  const codeColor: Record<string, string> = { S: '#10b981', W: '#e0ddae', H: '#f59e0b', F: '#e8431a', SF: '#10b981', '·': 'var(--fg-dim)' };

  if (scenes.length === 0) return null;

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{view === 'strips' ? 'Stripboard' : 'Day Out of Days'}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['strips', 'dood'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              background: view === v ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${view === v ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: view === v ? '#a5b4fc' : 'var(--fg-muted)',
            }}>{v === 'strips' ? 'Strips' : 'DOOD'}</button>
          ))}
        </div>
      </div>

      {view === 'strips' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 480 }}>
          {days.map(day => {
            const dayScenes = scenes.filter(s => (s.shoot_day || 1) === day).sort((a, b) => a.scene_number - b.scene_number);
            const dayEighths = dayScenes.reduce((t, s) => t + eighths(s), 0);
            return (
              <div key={day}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#818cf8' }}>DAY {day}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>{dayScenes.length} scene{dayScenes.length === 1 ? '' : 's'} · {(dayEighths / 8).toFixed(1)} pg</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {dayScenes.map(s => {
                    const c = stripColor(s);
                    const e = eighths(s);
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: c.bg, borderLeft: `4px solid ${c.bar}`, borderRadius: 4, padding: '7px 10px', minHeight: 22 + Math.min(e, 8) * 3 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, width: 28, flexShrink: 0 }}>{s.scene_number}</span>
                        <span style={{ flex: 1, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || 'Untitled'}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: readable(c.bar, 4.5, '#1d2b4a'), letterSpacing: 1, flexShrink: 0 }}>{c.label}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', width: 32, textAlign: 'right', flexShrink: 0 }}>{e}/8</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[['#10b981', 'EXT Night'], ['#f59e0b', 'EXT Day'], ['#3b82f6', 'INT Night'], ['rgba(255,255,255,0.5)', 'INT Day']].map(([col, lbl]) => (
              <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col }} /> {lbl}
              </span>
            ))}
          </div>
        </div>
      ) : (
        castRows.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>No cast tagged into scenes yet — add actors to scene cast lists to build the Day Out of Days.</div>
        ) : (
          <div style={{ minWidth: 120 + days.length * 34 }}>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, marginBottom: 6 }}>
              <div style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Actor</div>
              {days.map(d => <div key={d} style={{ width: 30, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: '#888' }}>{d}</div>)}
              <div style={{ width: 40, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9, color: '#888' }}>Days</div>
            </div>
            {castRows.map(row => (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                <div style={{ width: 120, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 6 }}>{row.name}</div>
                {row.cells.map((cell, i) => (
                  <div key={i} style={{ width: 30, textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: cell === '·' ? codeColor['·'] : readable(codeColor[cell]) }}>{cell === 'SF' ? 'SF' : cell}</span>
                  </div>
                ))}
                <div style={{ width: 40, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)' }}>{row.total}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[['S', 'Start'], ['W', 'Work'], ['H', 'Hold'], ['F', 'Finish']].map(([code, lbl]) => (
                <span key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>
                  <span style={{ fontWeight: 700, color: readable(codeColor[code]) }}>{code}</span> {lbl}
                </span>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
