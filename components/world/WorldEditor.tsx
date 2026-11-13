'use client';
import React, { useEffect, useRef, useState } from 'react';
import { emptyWorld, addLocation, type World, type WorldLocation, type WorldLore, type WorldRule, type WorldTimelineEvent } from '@/lib/world/world';
import { getWorld, saveWorld } from '@/lib/supabase/world';
import { exportWorldBible } from '@/lib/world/export';

const MAP_W = 720;
const MAP_H = 360;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * MAP_W,
  y: ((90 - lat) / 180) * MAP_H,
});

export function WorldEditor({ projectId }: { projectId: string }) {
  const [world, setWorld] = useState<World>(() => emptyWorld(projectId));
  const [name, setName] = useState('');
  const [loreTitle, setLoreTitle] = useState('');
  const [rule, setRule] = useState('');
  const [when, setWhen] = useState('');
  const [what, setWhat] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    getWorld(projectId).then((w) => { if (active && w) setWorld(w); setLoaded(true); }, () => setLoaded(true));
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveWorld(world).catch(() => {}); }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [world, loaded]);

  const located = world.locations.filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number');
  const patch = (id: string, p: Partial<WorldLocation>) => setWorld((w) => ({ ...w, locations: w.locations.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Location name" style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }} />
        <button type="button" onClick={() => exportWorldBible(world)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--fg)', cursor: 'pointer' }}>Export</button>
        <button type="button" onClick={() => { if (!name.trim()) return; setWorld((w) => addLocation(w, { id: crypto.randomUUID(), name: name.trim(), description: '', mood: '' })); setName(''); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>Add</button>
      </div>

      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ display: 'block', width: '100%', height: 'auto' }} role="img" aria-label="World map">
          <rect width={MAP_W} height={MAP_H} fill="rgba(var(--ink-rgb), 0.04)" />
          {Array.from({ length: 11 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * MAP_W / 12} y1={0} x2={(i + 1) * MAP_W / 12} y2={MAP_H} stroke="rgba(var(--ink-rgb), 0.08)" />)}
          {Array.from({ length: 5 }, (_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * MAP_H / 6} x2={MAP_W} y2={(i + 1) * MAP_H / 6} stroke="rgba(var(--ink-rgb), 0.08)" />)}
          {located.map((l) => {
            const { x, y } = project(l.lat!, l.lng!);
            return (
              <g key={l.id}>
                <circle cx={x} cy={y} r={5} fill="var(--accent)" stroke="var(--fg)" strokeWidth={1} />
                <text x={x + 8} y={y + 4} fontSize={11} fill="var(--fg)">{l.name}</text>
              </g>
            );
          })}
        </svg>
        {located.length === 0 && <p style={{ margin: 0, padding: 12, fontSize: 12, color: 'var(--fg-muted)' }}>Add coordinates to a location to see it on the map.</p>}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {world.locations.map((l: WorldLocation) => (
          <li key={l.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 8, display: 'grid', gap: 6, gridTemplateColumns: '1fr auto auto' }}>
            <span>{l.name}</span>
            <input type="number" value={l.lat ?? ''} onChange={(e) => patch(l.id, { lat: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="lat" aria-label={`${l.name} latitude`} style={{ width: 90, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
            <input type="number" value={l.lng ?? ''} onChange={(e) => patch(l.id, { lng: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="lng" aria-label={`${l.name} longitude`} style={{ width: 90, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          </li>
        ))}
      </ul>

      <section style={{ display: 'grid', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 12, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)' }}>Lore</h3>
        {world.lore.map((l: WorldLore) => (
          <div key={l.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <strong style={{ fontSize: 12 }}>{l.title}</strong>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{l.body}</span>
            <button type="button" onClick={() => setWorld((w) => ({ ...w, lore: w.lore.filter((x) => x.id !== l.id) }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={loreTitle} onChange={(e) => setLoreTitle(e.target.value)} placeholder="Title" aria-label="Lore title" style={{ flex: 1, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          <button type="button" onClick={() => { if (!loreTitle.trim()) return; setWorld((w) => ({ ...w, lore: [...w.lore, { id: crypto.randomUUID(), title: loreTitle.trim(), body: '' }] })); setLoreTitle(''); }} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>Add</button>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 12, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)' }}>Rules</h3>
        {world.rules.map((r: WorldRule) => (
          <div key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12 }}>{r.rule}</span>
            <button type="button" onClick={() => setWorld((w) => ({ ...w, rules: w.rules.filter((x) => x.id !== r.id) }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={rule} onChange={(e) => setRule(e.target.value)} placeholder="A rule of this world" aria-label="Rule" style={{ flex: 1, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          <button type="button" onClick={() => { if (!rule.trim()) return; setWorld((w) => ({ ...w, rules: [...w.rules, { id: crypto.randomUUID(), rule: rule.trim() }] })); setRule(''); }} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>Add</button>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 12, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)' }}>Timeline</h3>
        {world.timeline.map((t: WorldTimelineEvent) => (
          <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12 }}><strong>{t.when}</strong> — {t.what}</span>
            <button type="button" onClick={() => setWorld((w) => ({ ...w, timeline: w.timeline.filter((x) => x.id !== t.id) }))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="When" aria-label="When" style={{ flex: 1, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="What" aria-label="What" style={{ flex: 2, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          <button type="button" onClick={() => { if (!what.trim()) return; setWorld((w) => ({ ...w, timeline: [...w.timeline, { id: crypto.randomUUID(), when: when.trim(), what: what.trim() }] })); setWhen(''); setWhat(''); }} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer' }}>Add</button>
        </div>
      </section>
    </div>
  );
}
