'use client';
import React, { useState } from 'react';
import { emptyWorld, addLocation, type WorldLocation } from '@/lib/world/world';
import { exportWorldBible } from '@/lib/world/export';

const MAP_W = 720;
const MAP_H = 360;
const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * MAP_W,
  y: ((90 - lat) / 180) * MAP_H,
});

export function WorldEditor({ projectId }: { projectId: string }) {
  const [world, setWorld] = useState(emptyWorld(projectId));
  const [name, setName] = useState('');
  const located = world.locations.filter((l) => typeof l.lat === 'number' && typeof l.lng === 'number');
  const patch = (id: string, p: Partial<WorldLocation>) => setWorld((w) => ({ ...w, locations: w.locations.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Location name" style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }} />
        <button type="button" onClick={() => exportWorldBible(world)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--fg)', cursor: 'pointer' }}>Export</button>
        <button type="button" onClick={() => { if (!name.trim()) return; setWorld((w) => addLocation(w, { id: crypto.randomUUID(), name: name.trim(), description: '', mood: '' })); setName(''); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Add</button>
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
    </div>
  );
}
