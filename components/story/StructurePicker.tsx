'use client';
import React from 'react';
import { STRUCTURES, getStructure, type StoryStructure } from '@/lib/story/structures';

export function StructurePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <select
      aria-label="Story structure"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}
    >
      {STRUCTURES.map((s: StoryStructure) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}

export { getStructure };
