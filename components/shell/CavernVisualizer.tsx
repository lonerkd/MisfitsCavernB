'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Disc, Minimize2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import v from './visualizer.module.css';

const mmss = (ms: number) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** A small seeded generator, so the cave is the same cave every time it opens. */
function rng(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

/**
 * The cavern, full screen, for when the suite is open and music is playing: a slow generative cave (stalactites, drifting spores,
 * a glow that breathes). It follows the playback — alive while the song plays, dim and still when it is paused. It is NOT beat-synced:
 * Spotify gives a page no audio signal (the Web Playback stream is protected and its audio-analysis endpoints are closed to new apps),
 * so nothing here pretends to be a spectrum. Reduced-motion draws one still frame. Esc, the button or a tap-and-hold exits.
 */
export function CavernVisualizer({ onClose }: { onClose: () => void }) {
  const { currentTrack, isPlaying, progressMs, durationMs, togglePlay, nextTrack, prevTrack, seek } = useSpotify();
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const playing = useRef(isPlaying);
  useEffect(() => { playing.current = isPlaying; }, [isPlaying]);
  // The player's callbacks change identity whenever playback does (and the parent passes an inline onClose): the fullscreen and key
  // handlers read the latest through refs, so re-rendering never re-runs them (re-running exited fullscreen, which closed the cave).
  const latest = useRef({ onClose, togglePlay });
  useEffect(() => { latest.current = { onClose, togglePlay }; }, [onClose, togglePlay]);
  const [idle, setIdle] = useState(false);
  const wake = useCallback(() => setIdle(false), []);

  // Controls and the pointer fade after a few still seconds, so the cave has the screen.
  useEffect(() => {
    if (idle) return;
    const t = setTimeout(() => setIdle(true), 3500);
    return () => clearTimeout(t);
  }, [idle]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current.onClose();
      // Space plays or pauses, unless a control has focus: then Space is that control's own key (a second action would also run).
      else if (e.key === ' ' && !(e.target instanceof HTMLElement && e.target.closest('button, input, select, textarea, a'))) { e.preventDefault(); latest.current.togglePlay(); }
      setIdle(false);
    };
    window.addEventListener('keydown', esc);
    const el = root.current;
    // Real fullscreen where the browser has it (iOS Safari does not: the overlay already covers the screen).
    void el?.requestFullscreen?.().catch(() => {});
    const onFs = () => { if (!document.fullscreenElement && el) latest.current.onClose(); };
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', esc);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const r = rng(7);
    let w = 0, h = 0;
    const drips = Array.from({ length: 22 }, () => ({ x: r(), len: 0.12 + r() * 0.34, width: 0.012 + r() * 0.03 }));
    const spores = Array.from({ length: 70 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 1.6, v: 0.01 + r() * 0.03, ph: r() * 6.28 }));
    let energy = playing.current ? 1 : 0.15; // eases between alive and asleep
    let t = 0, last = performance.now(), raf = 0;
    const size = () => { const dpr = Math.min(window.devicePixelRatio || 1, 2); w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    window.addEventListener('resize', size);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      energy += ((playing.current ? 1 : 0.15) - energy) * Math.min(1, dt * 1.5);
      t += dt * (0.25 + energy * 0.75);
      const cx = w / 2, cy = h * 0.62;
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
      bg.addColorStop(0, `rgba(${40 + energy * 40}, ${18 + energy * 10}, ${10}, 1)`);
      bg.addColorStop(0.5, '#0a0710');
      bg.addColorStop(1, '#030206');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      // the glow, breathing
      const breath = 0.78 + Math.sin(t * 1.1) * 0.12 * energy;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.5 * breath);
      glow.addColorStop(0, `rgba(232, 67, 26, ${0.1 + 0.28 * energy})`);
      glow.addColorStop(1, 'rgba(232, 67, 26, 0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      // stalactites, swaying a hair
      ctx.fillStyle = '#020104';
      for (const d of drips) {
        const x = d.x * w, bw = d.width * w, len = d.len * h * (1 + Math.sin(t * 0.6 + d.x * 9) * 0.015 * energy);
        ctx.beginPath(); ctx.moveTo(x - bw, -2); ctx.lineTo(x + bw, -2); ctx.lineTo(x + Math.sin(t * 0.4 + d.x * 5) * 2, len); ctx.closePath(); ctx.fill();
      }
      ctx.fillRect(0, 0, w, h * 0.04);
      // spores rising through the light
      for (const p of spores) {
        p.y -= p.v * dt * (0.4 + energy * 2.2); if (p.y < -0.02) { p.y = 1.02; p.x = r(); }
        const px = p.x * w + Math.sin(t * 0.8 + p.ph) * 14, py = p.y * h;
        const near = 1 - Math.min(1, Math.hypot(px - cx, py - cy) / (Math.min(w, h) * 0.6));
        ctx.fillStyle = `rgba(255, ${150 + near * 70}, 90, ${(0.08 + near * 0.55) * (0.3 + energy * 0.7)})`;
        ctx.beginPath(); ctx.arc(px, py, p.s * (1 + near), 0, 6.283); ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, []);

  const art = currentTrack?.album?.images?.[0]?.url;
  const pct = durationMs ? Math.min(100, (progressMs / durationMs) * 100) : 0;
  const fade = idle ? `${v.fade} ${v.faded}` : v.fade;

  return createPortal(
    <div ref={root} role="dialog" aria-modal="true" aria-label="Cavern visualizer" onMouseMove={wake} onTouchStart={wake} onClick={wake} className={`${v.root} ${idle ? v.idle : ''}`}>
      <canvas ref={canvas} aria-hidden className={v.canvas} />
      <button type="button" aria-label="Close the visualizer" onClick={onClose} className={`${v.btn} ${v.close} ${fade}`}><Minimize2 size={20} /></button>
      <div className={`${v.bar} ${fade}`}>
        <div className={v.row}>
          {art ? <Image src={art} alt="" width={64} height={64} className={v.art} /> : <div className={v.art}><Disc size={26} /></div>}
          <div className={v.meta}>
            <div className={v.title}>{currentTrack?.name ?? 'Nothing playing'}</div>
            <div className={v.artist}>{currentTrack?.artists.map((a) => a.name).join(', ') ?? 'Start a song from the player or Spotify.'}</div>
          </div>
          <button type="button" aria-label="Previous track" onClick={prevTrack} className={v.btn}><SkipBack size={20} /></button>
          <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} className={`${v.btn} ${v.btnMain}`}>{isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>
          <button type="button" aria-label="Next track" onClick={nextTrack} className={v.btn}><SkipForward size={20} /></button>
        </div>
        <div className={v.seek}>
          <span>{mmss(progressMs)}</span>
          <input type="range" aria-label="Seek" min={0} max={Math.max(1, durationMs)} value={Math.min(progressMs, durationMs || 0)} disabled={!durationMs} onChange={(e) => seek(Number(e.target.value))} className={v.range} />
          <span>{mmss(durationMs)}</span>
        </div>
        <div aria-hidden className={v.progress} style={{ width: `${pct}%` }} />
      </div>
    </div>,
    document.body,
  );
}
