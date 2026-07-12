'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';

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
    return { bg: 'rgba(255,255,255,0.05)', bar: 'rgba(255,255,255,0.5)', label: 'INT · DAY' };
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

  const codeColor: Record<string, string> = { S: '#10b981', W: '#e0ddae', H: '#f59e0b', F: '#d7340b', SF: '#10b981', '·': 'rgba(255,255,255,0.12)' };

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
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#6366f1' }}>DAY {day}</span>
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
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: c.bar, letterSpacing: 1, flexShrink: 0 }}>{c.label}</span>
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
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: cell === '·' ? codeColor['·'] : codeColor[cell] }}>{cell === 'SF' ? 'SF' : cell}</span>
                  </div>
                ))}
                <div style={{ width: 40, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)' }}>{row.total}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[['S', 'Start'], ['W', 'Work'], ['H', 'Hold'], ['F', 'Finish']].map(([code, lbl]) => (
                <span key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)' }}>
                  <span style={{ fontWeight: 700, color: codeColor[code] }}>{code}</span> {lbl}
                </span>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function CallSheets({ scenes, crew, projectTitle }: { scenes: any[]; crew: any[]; projectTitle: string }) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const days = Array.from(new Set(scenes.map(s => s.shoot_day || 1))).sort((a, b) => a - b);

  const dayData = (day: number) => {
    const dayScenes = scenes.filter(s => (s.shoot_day || 1) === day).sort((a, b) => a.scene_number - b.scene_number);
    const locations = Array.from(new Set(dayScenes.map(s => s.location).filter(Boolean)));
    const cast = Array.from(new Set(dayScenes.flatMap(s => (s.cast_list ? String(s.cast_list).split(',').map((c: string) => c.trim()) : [])).filter(Boolean)));
    const eighths = dayScenes.reduce((t, s) => { const m = String(s.est_duration || '').match(/(\d+)\/8/); return t + (m ? Number(m[1]) : 0); }, 0);
    return { dayScenes, locations, cast, pages: eighths ? (eighths / 8).toFixed(1) : null };
  };

  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const printDay = (day: number) => {
    const d = dayData(day);
    const w = window.open('', '_blank', 'width=820,height=1060');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${esc(projectTitle)} — Call Sheet Day ${day}</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:40px;line-height:1.5}
      h1{font-size:20px;margin:0 0 2px;letter-spacing:2px}h2{font-size:11px;color:#b45309;letter-spacing:3px;margin:0 0 20px}
      h3{font-size:10px;letter-spacing:2px;color:#666;border-bottom:1px solid #ddd;padding-bottom:4px;margin:18px 0 8px}
      .row{display:flex;gap:24px}.col{flex:1}.sc{margin-bottom:4px;font-size:13px}.num{color:#999}</style></head><body>
      <h1>${esc(projectTitle).toUpperCase()}</h1><h2>CALL SHEET · DAY ${day}</h2>
      <div class="row"><div class="col"><h3>SCENES (${d.dayScenes.length}${d.pages ? ` · ${d.pages} pg` : ''})</h3>
      ${d.dayScenes.map((s: any) => `<div class="sc"><span class="num">${s.scene_number}.</span> ${esc(s.title)} ${s.time_of_day ? `<span class="num">(${esc(s.time_of_day)})</span>` : ''}</div>`).join('')}</div>
      <div class="col"><h3>LOCATIONS</h3>${d.locations.length ? d.locations.map((l: any) => `<div>${esc(l)}</div>`).join('') : '—'}
      <h3>CAST</h3>${d.cast.length ? esc(d.cast.join(', ')) : '—'}</div>
      <div class="col"><h3>CREW</h3>${crew.length ? crew.map((c: any) => `<div>${esc(c.name || c.profiles?.username || 'Crew')}${c.role ? ` — ${esc(c.role)}` : ''}</div>`).join('') : 'No crew assigned'}</div></div>
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
        <FileText size={16} /> Call Sheets <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--fg-dim)', fontWeight: 400 }}>· {days.length} shoot {days.length === 1 ? 'day' : 'days'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {days.map(day => {
          const d = dayData(day);
          const open = openDay === day;
          return (
            <div key={day} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, gridColumn: open ? '1 / -1' : 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenDay(open ? null : day)}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>DAY {day}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)' }}>{d.dayScenes.length} sc · {d.cast.length} cast{d.pages ? ` · ${d.pages} pg` : ''}</span>
              </div>
              {!open && (
                <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 8.5, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.locations.slice(0, 2).join(' · ') || 'No locations set'}
                </div>
              )}
              {open && (
                <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ color: '#f59e0b', fontWeight: 700, letterSpacing: 1 }}>{projectTitle.toUpperCase()} — CALL SHEET · DAY {day}</div>
                    <button onClick={() => printDay(day)} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: '#ddd', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', letterSpacing: 1 }}>⎙ PRINT / PDF</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <div>
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, marginBottom: 4 }}>SCENES</div>
                      {d.dayScenes.map(s => (
                        <div key={s.id} style={{ color: '#ddd', marginBottom: 2 }}>
                          <span style={{ color: '#888' }}>{s.scene_number}.</span> {s.title} {s.time_of_day ? <span style={{ color: '#666' }}>({s.time_of_day})</span> : null}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, marginBottom: 4 }}>LOCATIONS</div>
                      {d.locations.length ? d.locations.map(l => <div key={l} style={{ color: '#ddd' }}>{l}</div>) : <div style={{ color: '#555' }}>—</div>}
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, margin: '12px 0 4px' }}>CAST</div>
                      {d.cast.length ? <div style={{ color: '#ddd' }}>{d.cast.join(', ')}</div> : <div style={{ color: '#555' }}>—</div>}
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: 8, letterSpacing: 1.5, marginBottom: 4 }}>CREW</div>
                      {crew.length ? crew.slice(0, 12).map((c, i) => <div key={i} style={{ color: '#ddd' }}>{(c.name || c.profiles?.username || 'Crew')}{c.role ? <span style={{ color: '#666' }}> — {c.role}</span> : null}</div>) : <div style={{ color: '#555' }}>No crew assigned</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
