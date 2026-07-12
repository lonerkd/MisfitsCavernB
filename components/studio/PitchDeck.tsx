'use client';

import React, { useState } from 'react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import SectionLabel from '@/components/SectionLabel';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { parseScript } from '@/lib/scriptos/parser';
import { List as Info } from 'lucide-react';

export function ProjectPitchDeck({ project, concepts, beats }: { project: any; concepts: any[]; beats: any[] }) {
  const [characters, setCharacters] = useState<string[]>([]);
  const [present, setPresent] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: scripts } = await supabase.from('scripts').select('id,content').eq('project_id', project.id).order('updated_at', { ascending: false });
      const withContent = (scripts || []).find((s: any) => s.content && s.content.trim().length > 0) || (scripts || [])[0];
      if (!withContent) return;
      const { data: saved } = await supabase.from('script_characters').select('name,full_name').eq('script_id', withContent.id);
      let names = (saved || []).map((r: any) => r.full_name || r.name);
      if (names.length === 0 && withContent.content) {
        try { names = parseScript(withContent.content).characters.map((c: any) => c.name).filter(Boolean); } catch {  }
      }
      setCharacters(names.slice(0, 12));
    })();
  }, [project.id]);

  const visual = concepts[0]?.image_url;
  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const printDeck = () => {
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) return;
    const imgs = concepts.slice(0, 6).map((c: any) => `<img src="${esc(c.image_url)}" style="width:31%;height:120px;object-fit:cover;border-radius:6px;margin:0 1% 8px 0"/>`).join('');
    w.document.write(`<!doctype html><html><head><title>${esc(project.title)} — Pitch</title>
      <style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:48px;line-height:1.5}
      .slide{page-break-inside:avoid;margin-bottom:36px}h1{font-size:34px;letter-spacing:2px;margin:0 0 8px}
      .logline{font-size:16px;color:#444;max-width:640px}h2{font-size:11px;letter-spacing:3px;color:#b45309;border-bottom:1px solid #ddd;padding-bottom:4px;margin:28px 0 12px}
      .chip{display:inline-block;font-size:12px;padding:4px 10px;background:#eef;border:1px solid #ccd;border-radius:99px;margin:0 6px 6px 0}</style></head><body>
      <div class="slide"><h1>${esc(project.title).toUpperCase()}</h1><div class="logline">${esc(project.description || '')}</div></div>
      <div class="slide"><h2>THE VISUAL WORLD</h2>${imgs || '<div style="color:#999">No concept references yet.</div>'}</div>
      <div class="slide"><h2>THE CHARACTERS</h2>${characters.length ? characters.map(c => `<span class="chip">${esc(c)}</span>`).join('') : '<div style="color:#999">No characters yet.</div>'}</div>
      <div class="slide"><h2>STORY ENGINE</h2>${beats.length ? beats.slice(0, 6).map((b: any) => `<div>• ${esc(b.title)}</div>`).join('') : '<div style="color:#999">No story beats yet.</div>'}</div>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };
  const slides = [
    { label: 'Logline & Title', bg: undefined as string | undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '5rem' : '2rem', letterSpacing: 4, margin: '16px 0' }}>{project.title}</h3>
        <p style={{ fontFamily: 'var(--serif)', fontSize: big ? '1.4rem' : '0.85rem', color: 'var(--fg-muted)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>{project.description || 'Add a logline in the project summary.'}</p>
      </>
    ) },
    { label: 'The Visual World', bg: visual, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '2rem', letterSpacing: 4, margin: '16px 0' }}>THE VISUAL WORLD</h3>
        <div style={{ fontSize: big ? 14 : 10, fontFamily: 'var(--mono)', color: 'var(--accent)', textTransform: 'uppercase' }}>{concepts.length > 0 ? `${concepts.length} concept references` : 'Add references in the Concept board'}</div>
      </>
    ) },
    { label: 'The Characters', bg: undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '1.6rem', letterSpacing: 4, margin: '14px 0' }}>THE CHARACTERS</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 720, margin: '0 auto' }}>
          {characters.length > 0 ? characters.map(c => <span key={c} style={{ fontFamily: 'var(--mono)', fontSize: big ? 14 : 9.5, padding: big ? '6px 14px' : '4px 9px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 99 }}>{c}</span>) : <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Develop the Character Bible to populate the cast.</span>}
        </div>
      </>
    ) },
    { label: 'Story Engine', bg: undefined, render: (big: boolean) => (
      <>
        <h3 style={{ fontFamily: 'var(--display)', fontSize: big ? '4rem' : '1.6rem', letterSpacing: 4, margin: '14px 0' }}>STORY ENGINE</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 600, margin: '0 auto' }}>
          {beats.length > 0 ? beats.slice(0, 5).map((b: any) => <div key={b.id} style={{ fontFamily: 'var(--mono)', fontSize: big ? 13 : 10, color: '#ddd' }}>{b.title}</div>) : <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-dim)' }}>Add story beats in the Concept tab.</span>}
        </div>
      </>
    ) },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <SectionLabel text="Investor Relations" />
          <h2 style={{ fontFamily: 'var(--display)', fontSize: '2.5rem', letterSpacing: 2 }}>Pitch Deck</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="link-btn" onClick={printDeck}>⎙ Export PDF</button>
          <button className="link-btn" style={{ background: 'var(--accent)', color: 'var(--bg)' }} onClick={() => { setIdx(0); setPresent(true); }}>Enter Presentation View</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32, aspectRatio: '4/3', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            {s.bg && (<><NextImage src={s.bg} alt="" fill style={{ objectFit: 'cover', opacity: 0.3 }} /><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} /></>)}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <SectionLabel text={`Slide 0${i + 1}`} />
              {s.render(false)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, padding: 24, background: 'rgba(215, 52, 11,0.05)', border: '1px solid rgba(215, 52, 11,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Info size={20} color="var(--accent)" />
        <div style={{ fontSize: 12, color: '#ccc' }}><span style={{ fontWeight: 700, color: 'var(--accent)' }}>Live deck:</span> built from your logline, Concept board, Character Bible, and story beats — update them and this updates.</div>
      </div>

      <AnimatePresence>
        {present && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setPresent(false)} aria-label="exit" style={{ position: 'fixed', top: 24, right: 28, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2 }}>✕ EXIT</button>
            <div style={{ width: '80vw', maxWidth: 1100, aspectRatio: '16/9', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: 48 }}>
              {slides[idx].bg && (<><NextImage src={slides[idx].bg} alt="" fill style={{ objectFit: 'cover', opacity: 0.35 }} /><div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} /></>)}
              <div style={{ position: 'relative', zIndex: 1 }}>{slides[idx].render(true)}</div>
            </div>
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} aria-label="prev" style={{ position: 'fixed', left: 28, top: '50%', background: 'none', border: 'none', color: idx === 0 ? '#333' : '#fff', cursor: 'pointer', fontSize: 32 }}>‹</button>
            <button onClick={() => setIdx(i => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1} aria-label="next" style={{ position: 'fixed', right: 28, top: '50%', background: 'none', border: 'none', color: idx === slides.length - 1 ? '#333' : '#fff', cursor: 'pointer', fontSize: 32 }}>›</button>
            <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: '#666', letterSpacing: 2 }}>{idx + 1} / {slides.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
