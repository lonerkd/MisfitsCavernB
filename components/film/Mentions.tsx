'use client';

// Mentions in plain text. `MentionText` draws stored tokens as chips that show
// the entity's current name and open its card in the Studio; `MentionInput` is a
// text field where typing `@` offers the project's things to point at. What is
// stored and how it stays in step with the links: lib/film/mentions.ts.

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { activeQuery, insertMention, segments, tokenize } from '@/lib/film/mentions';
import type { Entity, EntityKind } from '@/lib/film/links';

const KIND_NAME: Record<EntityKind, string> = {
  scene: 'Scene', character: 'Character', location: 'Location', shoot_day: 'Day', task: 'Task', document: 'Document', media: 'Media',
};

export function MentionText({ text, projectId, entities }: { text: string; projectId: string; entities: Entity[] }) {
  const byId = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  return (
    <>
      {segments(text).map((seg, i) => {
        if (seg.type === 'text') return <React.Fragment key={i}>{seg.text}</React.Fragment>;
        const e = byId.get(seg.id);
        // A mention of something since deleted stays readable, not a dead link.
        if (!e) return <span key={i} style={{ color: 'var(--fg-muted)', textDecoration: 'line-through' }} title="No longer exists">@{seg.label}</span>;
        return (
          <Link key={i} href={`/studio?project=${projectId}&card=${e.id}`} title={KIND_NAME[e.kind]} style={{ color: 'var(--violet)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            @{e.label}
          </Link>
        );
      })}
    </>
  );
}

type Picked = { id: string; label: string };

/** A one-line field with an `@` picker. `onSubmit` gets the text with mentions as stored tokens. */
export function MentionInput({ entities, placeholder, onSubmit, style, buttonStyle }: {
  entities: Entity[];
  placeholder: string;
  onSubmit: (tokenised: string) => void;
  style?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
}) {
  const [text, setText] = useState('');
  const [caret, setCaret] = useState(0);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const active = activeQuery(text, caret);
  const options = useMemo(() => {
    if (!active) return [];
    const q = active.query.trim().toLowerCase();
    return entities.filter((e) => !q || e.label.toLowerCase().includes(q)).slice(0, 6);
  }, [active, entities]);
  const open = options.length > 0;

  const pick = (e: Entity) => {
    const next = insertMention(text, caret, e.id, e.label);
    if (!next) return;
    // The field shows `@Label`; the token is built on submit.
    const display = text.slice(0, active!.start) + `@${e.label} ` + text.slice(caret);
    setText(display);
    setPicked((p) => (p.some((x) => x.id === e.id) ? p : [...p, { id: e.id, label: e.label }]));
    setHighlight(0);
    const at = active!.start + e.label.length + 2;
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(at, at); setCaret(at); });
  };

  const submit = () => {
    const out = tokenize(text, picked).trim();
    if (!out) return;
    onSubmit(out);
    setText(''); setPicked([]); setCaret(0);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 6, marginTop: 6 }}>
      <input
        ref={input}
        value={text}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="mention-options"
        onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); setHighlight(0); }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (open && e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % options.length); return; }
          if (open && e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + options.length) % options.length); return; }
          if (open && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); pick(options[highlight]); return; }
          if (open && e.key === 'Escape') { e.preventDefault(); setCaret(0); return; }
          if (e.key === 'Enter') submit();
        }}
        style={{ flex: 1, minWidth: 0, ...style }}
      />
      <button type="button" aria-label="add" onClick={submit} style={buttonStyle}>+</button>
      {open && (
        <ul id="mention-options" role="listbox" aria-label="Mention" style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 20, margin: '4px 0 0', padding: 4, listStyle: 'none', background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 8, display: 'grid', gap: 2 }}>
          {options.map((o, i) => (
            <li key={o.id} role="option" aria-selected={i === highlight}>
              <button type="button" onMouseDown={(ev) => { ev.preventDefault(); pick(o); }} style={{ width: '100%', textAlign: 'left', background: i === highlight ? 'rgba(var(--ink-rgb), 0.08)' : 'none', border: 'none', borderRadius: 8, padding: '6px 8px', color: 'var(--fg-strong)', cursor: 'pointer', fontSize: 12 }}>
                <span style={{ color: 'var(--fg-muted)', marginRight: 8 }}>{KIND_NAME[o.kind]}</span>{o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
