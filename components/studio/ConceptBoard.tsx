'use client';

import React, { useState } from 'react';
import { Image, Plus } from 'lucide-react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useColorExtractor } from '@/hooks/useColorExtractor';
import { useEffect } from 'react';
import { List as Trash2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { searchReferences, type ReferenceResult } from '@/lib/references/search';

export function ConceptLightbox({ images, index, onIndex, onClose, onSetBoard, boards = [] }: { images: any[]; index: number; onIndex: (i: number) => void; onClose: () => void; onSetBoard?: (id: string, board: string | null) => void; boards?: string[] }) {
  const img = images[index];
  const [boardInput, setBoardInput] = useState('');
  useEffect(() => { setBoardInput(img?.board || ''); }, [img?.id, img?.board]);
  const go = (d: number) => onIndex((index + d + images.length) % images.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  if (!img) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={22} /></button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={22} /></button>
        </>
      )}
      <motion.div key={img.id} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <NextImage src={img.image_url} alt={img.title || ''} width={900} height={700} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 30px 90px rgba(0,0,0,0.7)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(224, 221, 174,0.7)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>{img.title || 'Untitled'}</span>
          <span style={{ color: 'rgba(224, 221, 174,0.3)' }}>·</span>
          <span style={{ color: 'rgba(224, 221, 174,0.4)' }}>{index + 1} / {images.length}</span>
          <a href={img.image_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#6366f1', textDecoration: 'none' }}>open original ↗</a>
          {onSetBoard && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <span style={{ color: 'rgba(224, 221, 174,0.3)' }}>·</span>
              <input
                list="mc-lightbox-boards"
                value={boardInput}
                placeholder="board…"
                onChange={(e) => setBoardInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSetBoard(img.id, boardInput.trim() || null); }}
                onBlur={() => { if ((boardInput.trim() || null) !== (img.board || null)) onSetBoard(img.id, boardInput.trim() || null); }}
                style={{ width: 130, padding: '4px 8px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 6, color: '#c084fc', fontFamily: 'var(--mono)', fontSize: 10, outline: 'none' }}
              />
              <datalist id="mc-lightbox-boards">{boards.map(b => <option key={b} value={b} />)}</datalist>
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ConceptCard({ image, index, onRemove, sceneCount = 0, onOpen, board }: { image: { id: string; url: string; title?: string }; index: number; onRemove?: () => void; sceneCount?: number; onOpen?: () => void; board?: string | null }) {
  const [isHovered, setIsHovered] = useState(false);
  const [broken, setBroken] = useState(false);
  const dominantColor = useColorExtractor(image.url);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        marginBottom: 16,
        breakInside: 'avoid',
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.05)',
        background: '#0a0a0a',
        boxShadow: isHovered && dominantColor ? `0 16px 40px ${dominantColor}66` : 'none',
        transition: 'box-shadow 0.4s ease-out'
      }}
    >
      {broken ? (
        <div onClick={onOpen} style={{ width: '100%', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, background: 'rgba(255,255,255,0.02)', cursor: onOpen ? 'pointer' : 'default' }}>
          <Image size={22} color="rgba(255,255,255,0.2)" aria-label="broken image" />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--fg-dim)', textAlign: 'center', wordBreak: 'break-word' }}>{image.title || 'Image unavailable'}</span>
        </div>
      ) : (
        <NextImage src={image.url} alt={image.title || 'Concept image'} width={400} height={300} onClick={onOpen} onError={() => setBroken(true)} style={{ width: '100%', height: 'auto', display: 'block', opacity: isHovered ? 1 : 0.8, transition: 'opacity 0.3s', cursor: onOpen ? 'zoom-in' : 'default' }} />
      )}

      {sceneCount > 0 && (
        <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: '#fff', background: 'rgba(99,102,241,0.85)', padding: '2px 7px', borderRadius: 99 }}>
          {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
        </div>
      )}
      {board && (
        <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1, color: '#c084fc', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', padding: '2px 7px', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
          {board}
        </div>
      )}

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.8))',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-end'
            }}
          >
            {onRemove && (
              <button
                onClick={onRemove}
                style={{ background: 'rgba(255,0,0,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff4444' }}
              >
                <Trash2 size={14} />
              </button>
            )}
            <div style={{ width: '100%' }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#fff', letterSpacing: 1, display: 'block' }}>{image.title || 'Untitled'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ReferenceSearchModal({
  isOpen, onClose, projectTitle, addedUrls, onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectTitle?: string;
  addedUrls: Set<string>;
  onAdd: (ref: ReferenceResult) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReferenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchReferences(query, 1);
      setResults(res.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (ref: ReferenceResult) => {
    setPending(prev => new Set(prev).add(ref.id));
    try { await onAdd(ref); } finally {
      setPending(prev => { const n = new Set(prev); n.delete(ref.id); return n; });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 900, maxHeight: '85vh', background: '#0c0c0c', border: '1px solid rgba(224,221,174,0.1)', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,221,174,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Reference Search</div>
              <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 2 }}>
                Search visual references{projectTitle ? ` for ${projectTitle}` : ''} and pin them to your moodboard.
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          <form onSubmit={runSearch} style={{ padding: '16px 24px', display: 'flex', gap: 10, borderBottom: '1px solid rgba(224,221,174,0.04)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(224,221,174,0.04)', border: '1px solid rgba(224,221,174,0.08)', borderRadius: 8, padding: '0 12px' }}>
              <Search size={15} color="#888" />
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="e.g. neon noir, blade runner, golden hour rooftop…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 13, padding: '12px 0' }}
              />
            </div>
            <button type="submit" disabled={loading || !query.trim()}
              style={{ padding: '0 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, cursor: loading ? 'default' : 'pointer', opacity: loading || !query.trim() ? 0.5 : 1 }}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>

          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {!searched ? (
              <div style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, padding: 60 }}>
                Search a mood, film, location, or look to find references.
              </div>
            ) : loading ? (
              <div style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, padding: 60 }}>Searching…</div>
            ) : results.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 12, padding: 60 }}>No references found. Try a different term.</div>
            ) : (
              <div style={{ columnCount: 3, columnGap: 12 }}>
                {results.map(ref => {
                  const added = addedUrls.has(ref.url);
                  const isPending = pending.has(ref.id);
                  return (
                    <div key={ref.id} style={{ marginBottom: 12, breakInside: 'avoid', position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(224,221,174,0.06)', background: '#050a14' }}>
                      <NextImage src={ref.thumbnail} alt={ref.title} width={300} height={200} loading="lazy" style={{ width: '100%', display: 'block' }} />
                      <div
                        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.85))', opacity: 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, gap: 8 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <div style={{ fontSize: 9, color: '#ccc', fontFamily: 'var(--mono)' }}>{ref.creator ? `${ref.creator} · ` : ''}{ref.source}</div>
                        <button
                          disabled={added || isPending}
                          onClick={() => handleAdd(ref)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: added ? 'rgba(0,204,102,0.2)' : 'var(--accent)', color: added ? '#00cc66' : '#000', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, cursor: added || isPending ? 'default' : 'pointer' }}
                        >
                          {added ? 'Added ✓' : isPending ? 'Adding…' : <><Plus size={12} /> Add to Board</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
