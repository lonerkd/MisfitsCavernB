'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Disc, Minimize2, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { blendCaves, makeCave, seedOf, type Cave } from '@/lib/cavern/cave';
import { asLight, dominantColour, WARM, type Rgb } from '@/lib/cavern/palette';
import { guideInput, isAuto, newRunner, NO_INPUT, stepRunner, type Input, type Runner } from '@/lib/cavern/runner';
import { makeSpores, stepSpores, type Spore } from '@/lib/cavern/spores';
import { drawScene, RUNNER_AT } from './cavernScene';
import v from './visualizer.module.css';

const mmss = (ms: number) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/**
 * The cavern, full screen: a stick-figure ninja runs through endless dark caves holding a lantern. Steer with the arrow keys (or
 * WASD) or by holding the mouse or a finger: right runs faster, left slower, up leaps, down crouches. Left alone for a few
 * seconds, it runs its own journey, and any input hands it back without a jerk. There is no way to lose.
 *
 * It follows the player: the cave is seeded from the song (the same song, the same cave), the light takes the cover's colour, and
 * the runner strolls when the music pauses. It is NOT beat-synced: Spotify gives a page no audio signal (the Web Playback stream is
 * protected and its audio-analysis endpoints are closed to new apps), so nothing here pretends to be a spectrum. Reduced-motion
 * draws one still frame. Esc or the button exits.
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

  // The world the loop reads: the cave and its seed, the runner, the light's colour, the held keys. Refs, so a re-render never
  // restarts the loop or the run.
  const trackId = (currentTrack as { id?: string } | null)?.id ?? currentTrack?.name ?? 'cavern';
  const art = currentTrack?.album?.images?.[0]?.url;
  const world = useRef<{ seed: number; cave: Cave; far: Cave; mid: Cave; runner: Runner | null; tint: Rgb; input: Input; guide: Input | null; want: number; settleFrom: number | null }>({
    seed: seedOf(trackId), cave: makeCave(seedOf(trackId)), far: makeCave(seedOf(trackId) + 101), mid: makeCave(seedOf(trackId) + 202), runner: null, tint: WARM, input: NO_INPUT, guide: null, want: seedOf(trackId), settleFrom: null,
  });
  useEffect(() => { world.current.want = seedOf(trackId); }, [trackId]);

  // The light takes the cover's colour. A cover the browser will not let us read (cross-origin) leaves the warm default.
  useEffect(() => {
    if (!art) { world.current.tint = WARM; return; }
    let on = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d'); if (!g) return;
        g.drawImage(img, 0, 0, 32, 32);
        if (on) world.current.tint = asLight(dominantColour(g.getImageData(0, 0, 32, 32).data));
      } catch { /* tainted: keep the default */ }
    };
    img.src = art;
    return () => { on = false; };
  }, [art]);

  // Steering: the arrow keys or WASD. A slider or text box keeps its own arrows.
  useEffect(() => {
    const keys: Record<string, keyof Input> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
    const own = (e: KeyboardEvent) => e.target instanceof HTMLElement && !!e.target.closest('input, select, textarea');
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = keys[e.key];
      if (!k || own(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      world.current.input = { ...world.current.input, [k]: on };
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const clear = () => { world.current.input = NO_INPUT; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);

  // Holding the mouse or a finger guides the runner toward it.
  const guideAt = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget, rect = c.getBoundingClientRect(), r = world.current.runner;
    if (!r) return;
    const h = rect.height;
    world.current.guide = guideInput(((e.clientX - rect.left) - rect.width * RUNNER_AT) / h, ((e.clientY - rect.top) - r.y * h) / h);
  }, []);
  const endGuide = useCallback(() => { world.current.guide = null; }, []);

  const distance = useRef<HTMLSpanElement>(null);
  const mode = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = world.current;
    const AHEAD = 3;
    let w = 0, h = 0;
    let energy = playing.current ? 1 : 0.15; // eases between alive and asleep
    let t = 0, last = performance.now(), raf = 0, shown = 0;
    W.runner = newRunner(W.cave, 0);
    let spores: Spore[] = makeSpores(70, W.cave, 0, AHEAD, W.seed);
    const size = () => {
      w = c.clientWidth; h = c.clientHeight;
      // Spend pixels carefully: a big screen at a high pixel ratio is drawn at fewer pixels rather than at a stutter.
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.4e6 / Math.max(1, w * h))));
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const r0 = W.runner!;
      // A new song: a new cave, blended in beyond the edge of the screen so nothing pops.
      if (W.want !== W.seed) {
        const from = r0.x + (w / h) * (1 - RUNNER_AT) + 1;
        W.cave = blendCaves(W.cave, makeCave(W.want), from, 5);
        W.far = blendCaves(W.far, makeCave(W.want + 101), from, 5);
        W.mid = blendCaves(W.mid, makeCave(W.want + 202), from, 5);
        W.seed = W.want;
        W.settleFrom = from + 5 + 0.5;
        spores = makeSpores(70, W.cave, r0.x, AHEAD, W.seed);
      }
      // Once a layer has left the blend fully behind the camera, it is just the new cave again (not a chain of blends).
      if (W.settleFrom !== null) {
        const aspect = w / h;
        const behind = (par: number) => par * r0.x - RUNNER_AT * aspect > W.settleFrom!;
        if (behind(1)) W.cave = makeCave(W.seed);
        if (behind(0.6)) W.mid = makeCave(W.seed + 202);
        if (behind(0.3)) { W.far = makeCave(W.seed + 101); W.settleFrom = null; }
      }
      energy += ((playing.current ? 1 : 0.15) - energy) * Math.min(1, dt * 1.5);
      t += dt * (0.25 + energy * 0.75);
      if (!reduce) {
        W.runner = stepRunner(r0, dt, W.guide ?? W.input, W.cave, playing.current);
        spores = stepSpores(spores, W.cave, W.runner.x, AHEAD, dt, W.seed);
      }
      const r = W.runner!;
      drawScene(ctx, w, h, { cave: W.cave, far: W.far, mid: W.mid, runner: r, t, energy, tint: W.tint, spores });
      if (now - shown > 500) {
        shown = now;
        if (distance.current) distance.current.textContent = `${Math.round(r.x * 3).toLocaleString()} m in`;
        if (mode.current) mode.current.textContent = isAuto(r) ? 'Exploring on its own: touch an arrow key to steer' : 'You are steering';
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, []);

  const pct = durationMs ? Math.min(100, (progressMs / durationMs) * 100) : 0;
  const fade = idle ? `${v.fade} ${v.faded}` : v.fade;

  return createPortal(
    <div ref={root} role="dialog" aria-modal="true" aria-label="Cavern visualizer" onMouseMove={wake} onTouchStart={wake} onClick={wake} className={`${v.root} ${idle ? v.idle : ''}`}>
      <canvas ref={canvas} aria-hidden className={v.canvas} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); guideAt(e); }} onPointerMove={(e) => { if (world.current.guide) guideAt(e); }} onPointerUp={endGuide} onPointerCancel={endGuide} />
      <div className={`${v.depth} ${fade}`} aria-live="off"><span ref={distance}>0 m in</span><span ref={mode}>Exploring on its own: touch an arrow key to steer</span><span>Following the player (the beat is not heard)</span></div>
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
