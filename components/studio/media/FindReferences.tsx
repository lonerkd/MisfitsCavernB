'use client';

import React, { useState } from 'react';
import { Check, Clapperboard, Image as ImageIcon, Plus, Search } from 'lucide-react';
import { searchReferences, type ReferenceResult } from '@/lib/references/search';
import { FILM_SEARCH_BY, FILM_SEARCH_LABEL, filmNotes, searchFilms, type FilmResult, type FilmSearchBy } from '@/lib/references/films';
import { studio, type Media } from '@/lib/studio';
import { Modal, cx } from '../ui';
import s from '../studio.module.css';

type Mode = 'films' | 'images';

/**
 * Find references two ways. Films: look a film up by its title, its director or its cinematographer (Wikidata) and keep
 * it in the library as a link with who made it and how it looks; then find stills from it. Images: search openly
 * licensed images (Openverse) and add them as links, with the creator and source kept in the notes for credit.
 */
export function FindReferences({ projectId, userId, existingUrls, board, onAdded, onClose }: {
  projectId: string;
  userId: string;
  existingUrls: Set<string>;
  board?: string | null;
  onAdded: (m: Media) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('films');
  const [query, setQuery] = useState('');
  const [by, setBy] = useState<FilmSearchBy>('title');
  const [results, setResults] = useState<ReferenceResult[]>([]);
  const [films, setFilms] = useState<FilmResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const run = async (m: Mode, q: string) => {
    if (!q.trim()) return;
    setState('loading');
    setError(null);
    try {
      if (m === 'films') {
        const res = await searchFilms(q, by);
        setFilms(res.films);
        setState(res.unavailable ? 'error' : 'done');
      } else {
        const res = await searchReferences(q, 1);
        setResults(res.results);
        setState('done');
      }
    } catch {
      setState('error');
    }
  };

  const search = (e: React.FormEvent) => { e.preventDefault(); void run(mode, query); };

  const switchMode = (m: Mode) => { setMode(m); setState('idle'); setError(null); };

  const stillsOf = (f: FilmResult) => {
    const q = `${f.title} ${f.year ?? ''} film still`.replace(/\s+/g, ' ').trim();
    setMode('images');
    setQuery(q);
    void run('images', q);
  };

  const addImage = async (ref: ReferenceResult) => {
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

  const addFilm = async (f: FilmResult) => {
    setPending((p) => new Set(p).add(f.id));
    setError(null);
    try {
      const m = await studio.addLink(projectId, userId, { url: f.url, title: f.year ? `${f.title} (${f.year})` : f.title, board: board ?? 'Film references' });
      onAdded(await studio.updateMedia(m.id, { notes: filmNotes(f) }));
      setAdded((a) => new Set(a).add(f.url));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(f.id); return n; });
    }
  };

  const placeholder = mode === 'images'
    ? 'A mood, a look, a place: "neon noir", "golden hour rooftop"'
    : by === 'title' ? 'A film: "Blade Runner 2049"' : by === 'director' ? 'A director: "Denis Villeneuve"' : 'A cinematographer: "Roger Deakins"';

  return (
    <Modal title="Find references" onClose={onClose}>
      <div role="tablist" aria-label="What to search" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" role="tab" aria-selected={mode === 'films'} className={s.btn} style={mode === 'films' ? { borderColor: 'var(--accent)' } : undefined} onClick={() => switchMode('films')}><Clapperboard size={12} /> Films</button>
        <button type="button" role="tab" aria-selected={mode === 'images'} className={s.btn} style={mode === 'images' ? { borderColor: 'var(--accent)' } : undefined} onClick={() => switchMode('images')}><ImageIcon size={12} /> Images</button>
      </div>
      <form onSubmit={search} className={s.row} style={{ marginBottom: 18 }}>
        <Search size={14} className={s.dim} aria-hidden />
        <label className={s.srOnly} htmlFor="find-refs">Search</label>
        {mode === 'films' && (
          <select className={s.select} aria-label="Search films by" value={by} onChange={(e) => setBy(e.target.value as FilmSearchBy)} style={{ width: 'auto' }}>
            {FILM_SEARCH_BY.map((b) => <option key={b} value={b}>{FILM_SEARCH_LABEL[b]}</option>)}
          </select>
        )}
        <input id="find-refs" data-autofocus autoFocus className={s.input} placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className={s.btnPrimary} disabled={!query.trim() || state === 'loading'}>{state === 'loading' ? 'Searching...' : 'Search'}</button>
      </form>
      {error && <p className={cx(s.hint, s.queueError)} role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {state === 'idle' && mode === 'images' && <p className={s.hint}>Openly licensed images from Openverse. Added images keep their creator and source in the notes, for credit.</p>}
      {state === 'idle' && mode === 'films' && <p className={s.hint}>Look a film up by its title, its director or its cinematographer (open data from Wikidata). Keep it in the library with who made it and how it looks, then find stills from it.</p>}
      {state === 'error' && <p className={s.hint}>Search is unavailable right now. Try again shortly.</p>}
      {state === 'done' && ((mode === 'films' && films.length === 0) || (mode === 'images' && results.length === 0)) && <p className={s.hint}>Nothing found. Try different words{mode === 'films' ? ' or another way to search' : ''}.</p>}

      {mode === 'films' && state === 'done' && films.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }} aria-label="Films found">
          {films.map((f) => {
            const isAdded = added.has(f.url) || existingUrls.has(f.url);
            return (
              <li key={f.id} className={s.card} style={{ cursor: 'default', display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.cardTitle}>{f.title}{f.year ? ` (${f.year})` : ''}</div>
                  <div className={s.hint}>
                    {[f.directors.length ? `Dir. ${f.directors.slice(0, 2).join(', ')}` : '', f.cinematographers.length ? `DP ${f.cinematographers.slice(0, 2).join(', ')}` : ''].filter(Boolean).join(' · ') || 'No credits on file'}
                  </div>
                  {f.genres.length > 0 && <div className={s.hint}>{f.genres.slice(0, 3).join(', ')}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className={cx(s.btn, s.small)} onClick={() => stillsOf(f)}>Find stills</button>
                  <button type="button" className={cx(isAdded ? s.btn : s.btnPrimary, s.small)} disabled={isAdded || pending.has(f.id)} onClick={() => void addFilm(f)}>
                    {isAdded ? <><Check size={11} /> In library</> : pending.has(f.id) ? 'Adding...' : <><Plus size={11} /> Keep</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {mode === 'images' && results.length > 0 && (
        <div className={s.grid}>
          {results.map((ref) => {
            const isAdded = added.has(ref.url) || existingUrls.has(ref.url);
            return (
              <div key={ref.id} className={s.card} style={{ cursor: 'default' }}>
                <div className={s.thumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- search-result thumbnails from third-party hosts */}
                  <img src={ref.thumbnail} alt={ref.title} loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardTitle} title={ref.title}>{ref.title}</div>
                  <div className={s.hint} style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))' }}>{[ref.creator, ref.source].filter(Boolean).join(' · ')}</div>
                  <button type="button" className={cx(isAdded ? s.btn : s.btnPrimary, s.small)} disabled={isAdded || pending.has(ref.id)} onClick={() => void addImage(ref)}>
                    {isAdded ? <><Check size={11} /> In library</> : pending.has(ref.id) ? 'Adding...' : <><Plus size={11} /> Add</>}
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
