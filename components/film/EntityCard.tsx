'use client';

// The card: opens any scene, character, location or shoot day from anywhere in
// the Studio and shows its facts, what the film graph connects it to, and what
// has been attached to it. Open it with `useStudio().openCard(id)`. Behind flag
// `entity_cards`. What it shows is `lib/film/card.ts`; this only draws it.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useOnChange } from '@/lib/hooks/useOnChange';
import { useStudio } from '@/components/studio/StudioContext';
import { useCharacters, useSceneCharacters, useProjectLocations, useShootDays } from '@/lib/studio';
import { attach, detach, useEntities, useLinks, type EntityKind } from '@/lib/film/links';
import { attachCandidates, cardOf, type CardScene } from '@/lib/film/card';
import { useToast } from '@/components/ui/Toast';

const KIND_NAME: Record<EntityKind, string> = {
  scene: 'Scene', character: 'Character', location: 'Location', shoot_day: 'Shoot day',
  task: 'Task', document: 'Document', media: 'Media',
};
// Only these have a card of their own with connections; the rest show what they're attached to.
const OPENS = new Set<EntityKind>(['scene', 'character', 'location', 'shoot_day', 'task', 'document', 'media']);

export function EntityCardHost() {
  const { project, scenes, castOf, cardId, closeCard } = useStudio();
  const open = cardId !== null;
  const scope = open ? project.id : null;
  const entities = useEntities(scope);
  const links = useLinks(scope);
  const characters = useCharacters(scope);
  const sceneCharacters = useSceneCharacters(scope);
  const places = useProjectLocations(scope);
  const days = useShootDays(scope);
  // Where you've been inside the card, so Back works after following a link.
  const [trail, setTrail] = useState<string[]>([]);
  const current = trail[trail.length - 1] ?? cardId;
  const panel = useRef<HTMLElement>(null);
  const { toast } = useToast();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');

  // A new card opened from outside starts a fresh trail.
  useOnChange(cardId, () => setTrail([]));
  useOnChange(current, () => { setPicking(false); setQuery(''); });
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCard(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeCard]);

  const card = useMemo(() => {
    if (!current) return null;
    return cardOf(current, {
      entities: entities.rows,
      links: links.rows,
      scenes: scenes.rows as CardScene[],
      characters: characters.rows,
      places: places.rows,
      days: days.rows,
      castOf: (s) => { const row = scenes.rows.find((r) => r.id === s.id); return row ? castOf(row) : []; },
      sceneCharacters: sceneCharacters.rows,
    });
  }, [current, entities.rows, links.rows, scenes.rows, characters.rows, places.rows, days.rows, castOf, sceneCharacters.rows]);

  const candidates = useMemo(
    () => (current && picking ? attachCandidates(current, entities.rows, links.rows, query) : []),
    [current, picking, entities.rows, links.rows, query],
  );

  if (!open) return null;

  const doAttach = async (otherId: string) => {
    if (!current) return;
    const res = await attach(project.id, current, otherId);
    if ('error' in res) { toast(`Could not attach it: ${res.error}`, 'error'); return; }
    void links.reload();
  };
  const doDetach = async (linkId: string) => {
    const error = await detach(linkId);
    if (error) { toast(`Could not remove it: ${error}`, 'error'); return; }
    void links.reload();
  };
  const loading = entities.status === 'loading';
  const failed = entities.status === 'error';

  const groupTitle: React.CSSProperties = { margin: '16px 0 6px', fontSize: 12, color: 'var(--fg-muted)', fontWeight: 600 };
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      role="dialog"
      aria-label={card ? `${KIND_NAME[card.kind]}: ${card.title}` : 'Card'}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', zIndex: 60, overflowY: 'auto',
        background: 'var(--bg-2)', color: 'var(--fg)', borderLeft: '1px solid var(--border-2)', padding: '16px 16px 96px', outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {trail.length > 0 && (
          <button type="button" aria-label="Back" onClick={() => setTrail((t) => t.slice(0, -1))} style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><ArrowLeft size={16} aria-hidden /></button>
        )}
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{card ? KIND_NAME[card.kind] : ''}</span>
        <button type="button" aria-label="Close card" onClick={closeCard} style={{ marginLeft: 'auto', display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><X size={16} aria-hidden /></button>
      </div>

      {loading && !card && <p style={{ color: 'var(--fg-muted)' }}>Loading…</p>}
      {failed && <p role="alert" style={{ color: 'var(--danger)' }}>Could not load this card. <button type="button" onClick={() => void entities.reload()} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>Try again</button></p>}
      {!loading && !failed && !card && <p style={{ color: 'var(--fg-muted)' }}>This isn’t here any more.</p>}

      {card && (
        <>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', margin: '4px 0 12px', color: 'var(--fg-strong)' }}>{card.title}</h2>
          {card.facts.length > 0 && (
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0, fontSize: 14 }}>
              {card.facts.map((f) => (
                <React.Fragment key={f.label}>
                  <dt style={{ color: 'var(--fg-muted)' }}>{f.label}</dt>
                  <dd style={{ margin: 0 }}>{f.value}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          {[...card.connected, ...card.attached].map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 style={groupTitle}>{g.title}</h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
                {g.items.map((item) => (
                  <li key={item.id} style={{ display: 'flex', gap: 6 }}>
                    {OPENS.has(item.kind) ? (
                      <button type="button" onClick={() => setTrail((t) => [...t, item.id])} style={{ flex: 1, textAlign: 'left', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--fg-strong)', cursor: 'pointer', fontSize: 14 }}>{item.label}</button>
                    ) : <span style={{ flex: 1 }}>{item.label}</span>}
                    {item.linkId && (
                      <button type="button" aria-label={`Remove ${item.label}`} onClick={() => void doDetach(item.linkId!)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={14} aria-hidden /></button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {card.connected.length === 0 && card.attached.length === 0 && card.facts.length === 0 && (
            <p style={{ color: 'var(--fg-muted)' }}>Nothing is connected to this yet.</p>
          )}
          <section aria-label="Attach" style={{ marginTop: 16 }}>
            {!picking ? (
              <button type="button" onClick={() => setPicking(true)} style={{ background: 'none', border: '1px dashed var(--border-2)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', cursor: 'pointer', fontSize: 14 }}>+ Attach</button>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                  Attach a task, document, media item…
                  <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" style={{ background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: 8, color: 'var(--fg-strong)' }} />
                </label>
                {candidates.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 14 }}>{query.trim() ? 'Nothing matches.' : 'Nothing left to attach.'}</p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
                    {candidates.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => void doAttach(c.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--fg-strong)', cursor: 'pointer', fontSize: 14 }}>
                          <span style={{ color: 'var(--fg-muted)', marginRight: 8 }}>{KIND_NAME[c.kind]}</span>{c.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div><button type="button" onClick={() => { setPicking(false); setQuery(''); }} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', textDecoration: 'underline' }}>Done</button></div>
              </div>
            )}
          </section>
        </>
      )}
    </aside>
  );
}
