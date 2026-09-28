'use client';

import React, { useMemo, useState } from 'react';
import { Check, Globe, Link2, Search } from 'lucide-react';
import { useSignedUrls, mediaSrc, type Media } from '@/lib/studio';
import { MediaThumbVisual, kindLabel } from './MediaThumb';
import { cx } from '../ui';
import s from '../studio.module.css';

export type KindFilter = 'all' | Media['kind'];
const KINDS: Array<{ id: KindFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'document', label: 'PDFs' },
  { id: 'link', label: 'Links' },
];

/** Kind + board filters and search over a media list. */
export function useMediaFilters(items: Media[]) {
  const [kind, setKind] = useState<KindFilter>('all');
  const [board, setBoard] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const boards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of items) if (m.board) counts.set(m.board, (counts.get(m.board) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  const kindCounts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const m of items) c[m.kind] = (c[m.kind] ?? 0) + 1;
    return c;
  }, [items]);
  // A board filter that no longer exists (renamed by a teammate) falls away.
  const activeBoard = board && boards.some(([b]) => b === board) ? board : null;
  const q = query.trim().toLowerCase();
  const filtered = items.filter((m) =>
    (kind === 'all' || m.kind === kind) &&
    (!activeBoard || m.board === activeBoard) &&
    (!q || m.title.toLowerCase().includes(q) || (m.board ?? '').toLowerCase().includes(q) || (m.notes ?? '').toLowerCase().includes(q)),
  );
  return { kind, setKind, board: activeBoard, setBoard, query, setQuery, boards, kindCounts, filtered };
}

export function MediaFilters({ f }: { f: ReturnType<typeof useMediaFilters> }) {
  return (
    <div className={s.stack} style={{ gap: 10, marginBottom: 20 }}>
      <div className={s.toolbar} style={{ marginBottom: 0 }}>
        <div className={s.chips} role="group" aria-label="Filter by type">
          {KINDS.filter((k) => k.id === 'all' || f.kindCounts[k.id]).map((k) => (
            <button key={k.id} type="button" aria-pressed={f.kind === k.id} className={cx(s.chip, f.kind === k.id && s.chipOn)} onClick={() => f.setKind(k.id)}>
              {k.label} <span className={s.count}>{f.kindCounts[k.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className={cx(s.row, s.search)} style={{ gap: 6 }}>
          <Search size={13} className={s.dim} aria-hidden />
          <span className={s.srOnly}>Search the library</span>
          <input className={s.input} type="search" placeholder="Search titles, boards, notes" value={f.query} onChange={(e) => f.setQuery(e.target.value)} />
        </label>
      </div>
      {f.boards.length > 0 && (
        <div className={s.chips} role="group" aria-label="Filter by board">
          <button type="button" aria-pressed={!f.board} className={cx(s.chip, !f.board && s.chipOn)} onClick={() => f.setBoard(null)}>All boards</button>
          {f.boards.map(([b, n]) => (
            <button key={b} type="button" aria-pressed={f.board === b} className={cx(s.chip, f.board === b && s.chipOn)} onClick={() => f.setBoard(f.board === b ? null : b)}>
              {b} <span className={s.count}>{n}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaGrid({
  items,
  onOpen,
  selected,
  sceneCounts,
}: {
  items: Media[];
  onOpen: (m: Media) => void;
  /** When set, cards act as a multi-select. */
  selected?: Set<string>;
  sceneCounts?: Map<string, string[]>;
}) {
  const signed = useSignedUrls(items.map((m) => (m.kind === 'image' || m.kind === 'video' ? m.storage_path : null)));
  return (
    <div className={s.grid}>
      {items.map((m) => {
        const isSelected = selected?.has(m.id) ?? false;
        const scenes = sceneCounts?.get(m.id)?.length ?? 0;
        return (
          <button
            key={m.id}
            type="button"
            className={cx(s.card, isSelected && s.cardSelected)}
            onClick={() => onOpen(m)}
            aria-pressed={selected ? isSelected : undefined}
            aria-label={`${m.title || 'Untitled'} — ${kindLabel(m.kind)}`}
          >
            <div className={s.thumb}>
              <MediaThumbVisual media={m} src={mediaSrc(m, signed)} />
              {isSelected && <span className={s.check}><Check size={13} /></span>}
            </div>
            <div className={s.cardBody}>
              <div className={s.cardTitle}>{m.title || 'Untitled'}</div>
              <div className={s.cardMeta}>
                {m.board && <span className={s.tag}>{m.board}</span>}
                {scenes > 0 && <span className={cx(s.tag, s.tagStudio)}><Link2 size={9} /> {scenes} scene{scenes === 1 ? '' : 's'}</span>}
                {m.shared && <span className={cx(s.tag, s.tagShared)}><Globe size={9} /> Shared</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={s.grid} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => <div key={i} className={cx('skeleton', s.skeletonCard)} />)}
    </div>
  );
}
