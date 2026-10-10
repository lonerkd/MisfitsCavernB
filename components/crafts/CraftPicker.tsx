'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { byDepartment, searchCrafts, useCrafts } from '@/lib/crafts/crafts';
import { readable } from '@/lib/util/color';
import p from './craftPicker.module.css';

/**
 * Pick a craft from the suite's list: a button that opens a searchable list
 * grouped by department. `noneLabel` offers an empty choice (e.g. "Any
 * craft" in a filter, or clearing a profile's craft).
 */
export function CraftPicker({ value, onChange, label, placeholder = 'Choose a craft', noneLabel, id }: {
  value: string | null;
  onChange: (craft: string | null) => void;
  /** Accessible name for the button, e.g. "Craft". */
  label: string;
  placeholder?: string;
  noneLabel?: string;
  id?: string;
}) {
  const { crafts, byName } = useCrafts();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popId = useId();
  const current = value ? byName.get(value) : undefined;

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDoc = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const choose = (craft: string | null) => {
    onChange(craft);
    setOpen(false);
    setQ('');
    triggerRef.current?.focus();
  };

  const groups = byDepartment(searchCrafts(crafts, q));

  return (
    <div ref={wrapRef} className={p.wrap} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } }}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={p.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-label={`${label}: ${value ?? noneLabel ?? placeholder}`}
        onClick={() => setOpen((o) => !o)}
      >
        {current && <span className={p.dot} style={{ background: current.color }} aria-hidden />}
        <span className={value ? undefined : p.placeholder}>{value ?? noneLabel ?? placeholder}</span>
        <span className={p.caret} aria-hidden><ChevronDown size={13} /></span>
      </button>
      {open && (
        <div id={popId} className={p.pop} role="dialog" aria-label={label}>
          <label htmlFor={`${popId}-q`} className="sr-only">Search crafts</label>
          <input
            id={`${popId}-q`}
            ref={searchRef}
            className={p.search}
            placeholder="Search — e.g. gaffer, sound, camera…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const first = groups[0]?.crafts[0];
                if (first) choose(first.name);
              }
            }}
          />
          <div className={p.list}>
            {noneLabel && !q && (
              <button type="button" className={p.clear} onClick={() => choose(null)}>{noneLabel}</button>
            )}
            {groups.length === 0 && <p className={p.empty}>No craft matches “{q}”.</p>}
            {groups.map((g) => (
              <div key={g.department} className={p.dept} role="group" aria-labelledby={`${popId}-${g.department}`}>
                <h3 id={`${popId}-${g.department}`} className={p.deptName}>{g.department}</h3>
                <div className={p.chips}>
                  {g.crafts.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className={`${p.chip} ${value === c.name ? p.chipOn : ''}`}
                      style={{ ['--c' as string]: readable(c.color) }}
                      aria-pressed={value === c.name}
                      onClick={() => choose(c.name)}
                    >
                      <span className={p.dot} aria-hidden />{c.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A craft as a small coloured label (profile cards, job rows, crew lists). */
export function CraftBadge({ craft, color, upper = false }: { craft: string; color?: string; upper?: boolean }) {
  const { byName } = useCrafts();
  const c = color ?? byName.get(craft)?.color ?? '#a3a3a3';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: upper ? 1.5 : 0.3, textTransform: upper ? 'uppercase' : 'none', color: readable(c) }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{craft}
    </span>
  );
}
