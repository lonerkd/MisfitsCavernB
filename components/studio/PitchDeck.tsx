'use client';

import React, { useState } from 'react';
import { pitchDoc } from '@/lib/studio/pitch-print';
import { printDocument } from '@/lib/print/print';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SectionLabel from '@/components/ui/SectionLabel';
import { listScriptCharacters } from '@/lib/supabase/scripts';
import { fetchScriptContent } from '@/lib/studio';
import { useEffect } from 'react';
import { parseScript } from '@/lib/scriptos/parser';
import { List as Info } from 'lucide-react';
import type { Beat, Project } from '@/lib/os';

export interface PitchImage { id: string; image_url: string; title: string | null }

/** Live pitch deck: logline, look (library images), characters, story beats. */
export function ProjectPitchDeck({ project, concepts, beats, scriptId }: { project: Project; concepts: PitchImage[]; beats: Beat[]; scriptId: string | null }) {
  const [characters, setCharacters] = useState<string[]>([]);
  const [present, setPresent] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!scriptId) { setCharacters([]); return; }
      const [content, saved] = await Promise.all([fetchScriptContent(scriptId), listScriptCharacters(scriptId)]);
      let names = saved.map((r) => r.full_name || r.name);
      if (names.length === 0 && content) names = parseScript(content).characters.map((c) => c.name).filter(Boolean);
      if (alive) setCharacters(names.slice(0, 12));
    })().catch(() => { if (alive) setCharacters([]); });
    return () => { alive = false; };
  }, [scriptId]);

  const visual = concepts[0]?.image_url;
  const printDeck = () => {
    printDocument(pitchDoc({
      title: project.title,
      accent: project.accent_color,
      logline: project.description || null,
      concepts: concepts.map((c) => ({ url: c.image_url, title: c.title || null })),
      characters,
      beats: beats.map((b) => b.title),
      generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    }));
  };
  const slides = [
    { label: 'Logline & Title', bg: undefined as string | undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '5rem' : '2rem', letterSpacing: '-0.02em', margin: '16px 0' }}>{project.title}</h3>
        <p style={{ fontFamily: 'var(--serif)', fontSize: big ? '1.4rem' : '0.85rem', color: 'var(--fg-muted)', maxWidth: 'var(--w-reading)', margin: '0 auto', lineHeight: 1.6 }}>{project.description || 'Add a logline in the project summary.'}</p>
      </>
    ) },
    { label: 'The Visual World', bg: visual, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '2rem', letterSpacing: '-0.02em', margin: '16px 0' }}>THE VISUAL WORLD</h3>
        <div style={{ fontSize: big ? 14 : 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'var(--caps)' }}>{concepts.length > 0 ? `${concepts.length} concept references` : 'Add images in the Library'}</div>
      </>
    ) },
    { label: 'The Characters', bg: undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '1.6rem', letterSpacing: '-0.02em', margin: '14px 0' }}>THE CHARACTERS</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 'var(--w-reading)', margin: '0 auto' }}>
          {characters.length > 0 ? characters.map(c => <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: big ? 14 : 9.5, padding: big ? '6px 14px' : '4px 9px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--violet)', borderRadius: 9999 }}>{c}</span>) : <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Develop the Character Bible to populate the cast.</span>}
        </div>
      </>
    ) },
    { label: 'Story Engine', bg: undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '1.6rem', letterSpacing: '-0.02em', margin: '14px 0' }}>STORY ENGINE</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 600, margin: '0 auto' }}>
          {beats.length > 0 ? beats.slice(0, 5).map((b) => <div key={b.id} style={{ fontFamily: 'var(--mono)', fontSize: big ? 13 : 10, color: '#ddd' }}>{b.title}</div>) : <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Add story beats in Production → Story.</span>}
        </div>
      </>
    ) },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
        <div>
          <SectionLabel text="Investor Relations" />
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: '-0.02em' }}>Pitch Deck</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="link-btn" onClick={printDeck}>⎙ Export PDF</button>
          <button className="link-btn" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }} onClick={() => { setIdx(0); setPresent(true); }}>Present</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.05)', borderRadius: 14, padding: 32, aspectRatio: '4/3', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a signed storage URL or a linked image on any host */}
            {s.bg && (<><img src={s.bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} /><div style={{ position: 'absolute', inset: 0, background: 'var(--sunken)' }} /></>)}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <SectionLabel text={`Slide 0${i + 1}`} />
              {s.render(false)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, padding: 24, background: 'rgba(232, 67, 26,0.05)', border: '1px solid rgba(232, 67, 26,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Info size={20} color="var(--accent)" />
        <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}><span style={{ fontWeight: 700, color: 'var(--accent)' }}>Live deck:</span> built from your logline, the Library, the Character Bible and story beats — update them and this updates.</div>
      </div>

      {/* Portalled above the Studio header and the suite dock. */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {present && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setPresent(false)} aria-label="exit" style={{ position: 'fixed', top: 24, right: 28, background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)' }}>✕ EXIT</button>
            <div style={{ width: '80vw', maxWidth: 'var(--w-content)', aspectRatio: '16/9', background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed storage URL or a linked image on any host */}
              {slides[idx].bg && (<><img src={slides[idx].bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} /><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} /></>)}
              <div style={{ position: 'relative', zIndex: 1 }}>{slides[idx].render(true)}</div>
            </div>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} aria-label="prev" style={{ position: 'fixed', left: 28, top: '50%', background: 'none', border: 'none', color: idx === 0 ? '#333' : '#fff', cursor: 'pointer', fontSize: 32 }}>‹</button>
            <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} aria-label="next" style={{ position: 'fixed', right: 28, top: '50%', background: 'none', border: 'none', color: idx === slides.length - 1 ? '#333' : '#fff', cursor: 'pointer', fontSize: 32 }}>›</button>
            <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)' }}>{idx + 1} / {slides.length}</div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </motion.div>
  );
}
