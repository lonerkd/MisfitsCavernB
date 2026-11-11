'use client';
import React, { useState } from 'react';
import type { Relationship } from '@/lib/characters/depth';

export function RelationshipMap({ relationships, onChange }: { relationships: Relationship[]; onChange: (r: Relationship[]) => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [kind, setKind] = useState('ally');
  const add = () => {
    if (!a.trim() || !b.trim()) return;
    onChange([...relationships, { a: a.trim(), b: b.trim(), kind, note: '' }]);
    setA(''); setB('');
  };
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {relationships.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <strong>{r.a}</strong>
          <span style={{ color: 'var(--fg-muted)' }}>{r.kind}</span>
          <strong>{r.b}</strong>
          <button type="button" onClick={() => onChange(relationships.filter((_, j) => j !== i))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }} aria-label="Remove">×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Character A" style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
          {['ally', 'rival', 'family', 'romance', 'mentor', 'other'].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Character B" style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
        <button type="button" onClick={add} style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  );
}
