'use client';

import React, { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { searchReferences, type ReferenceResult } from '@/lib/references/search';
import { studio, type Media } from '@/lib/studio';
import { Modal, cx } from '../ui';
import s from '../studio.module.css';

/**
 * Search openly licensed images (Openverse) and add them to the library as
 * links, with the creator and source kept in the notes for credit.
 */
export function FindReferences({ projectId, userId, existingUrls, board, onAdded, onClose }: {
  projectId: string;
  userId: string;
  existingUrls: Set<string>;
  board?: string | null;
  onAdded: (m: Media) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReferenceResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setState('loading');
    try {
      const res = await searchReferences(query, 1);
      setResults(res.results);
      setState('done');
    } catch {
      setState('error');
    }
  };

  const add = async (ref: ReferenceResult) => {
    setPending((p) => new Set(p).add(ref.id));
    setError(null);
    try {
      const m = await studio.addLink(projectId, userId, { url: ref.url, title: ref.title, board });
      const credit = [ref.creator && `By ${ref.creator}`, `via ${ref.source}`, ref.sourceUrl].filter(Boolean).join(' · ');
      onAdded(await studio.updateMedia(m.id, { notes: credit }));
      setAdded((a) => new Set(a).add(ref.url));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(ref.id); return n; });
    }
  };

  return (
    <Modal title="Find references" onClose={onClose}>
      <form onSubmit={search} className={s.row} style={{ marginBottom: 18 }}>
        <Search size={14} className={s.dim} aria-hidden />
        <label className={s.srOnly} htmlFor="find-refs">Search</label>
        <input id="find-refs" data-autofocus autoFocus className={s.input} placeholder="A mood, a look, a place — “neon noir”, “golden hour rooftop”" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className={s.btnPrimary} disabled={!query.trim() || state === 'loading'}>{state === 'loading' ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <p className={cx(s.hint, s.queueError)} role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {state === 'idle' && <p className={s.hint}>Openly licensed images from Openverse. Added images keep their creator and source in the notes, for credit.</p>}
      {state === 'error' && <p className={s.hint}>Search is unavailable right now — try again shortly.</p>}
      {state === 'done' && results.length === 0 && <p className={s.hint}>Nothing found. Try different words.</p>}
      {results.length > 0 && (
        <div className={s.grid}>
          {results.map((ref) => {
            const isAdded = added.has(ref.url) || existingUrls.has(ref.url);
            return (
              <div key={ref.id} className={s.card} style={{ cursor: 'default' }}>
                <div className={s.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.thumbnail} alt={ref.title} loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardTitle} title={ref.title}>{ref.title}</div>
                  <div className={s.hint} style={{ fontSize: 9 }}>{[ref.creator, ref.source].filter(Boolean).join(' · ')}</div>
                  <button type="button" className={cx(isAdded ? s.btn : s.btnPrimary, s.small)} disabled={isAdded || pending.has(ref.id)} onClick={() => void add(ref)}>
                    {isAdded ? <><Check size={11} /> In library</> : pending.has(ref.id) ? 'Adding…' : <><Plus size={11} /> Add</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
