'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Disc, Ear, EarOff, Maximize2, Minimize2, Pause, PictureInPicture2, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useSpotify } from '@/lib/os/SpotifyContext';
import { useToast } from '@/components/ui/Toast';
import { createBeatTracker, SILENT, smoothLevel, type Levels } from '@/lib/cavern/audio';
import { captureSupported, startCapture, type Capture, CaptureError } from '@/lib/cavern/capture';
import { blendCaves, makeCave, seedOf, type Cave, type ZoneSegment } from '@/lib/cavern/cave';
import { describeSync, journeyLength, journeyPace, journeyTarget, journeyTint, journeyZones, needsResync, originFor, songFraction, type Journey, type JourneyStatus } from '@/lib/cavern/journey';
import { useJourney } from '@/lib/cavern/useJourney';
import { asLight, dominantColour, WARM, type Rgb } from '@/lib/cavern/palette';
import { guideInput, isAuto, newRunner, NO_INPUT, stepRunner, type Input, type Runner } from '@/lib/cavern/runner';
import { makeSpores, stepSpores, type Spore } from '@/lib/cavern/spores';
import { drawScene, RUNNER_AT } from './cavernScene';
import v from './visualizer.module.css';

const mmss = (ms: number) => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** A mouse that has stopped moving this long lets go: a pointer left resting over the cave must not steer it for ever (or keep the autopilot off). */
const HOVER_REST_MS = 2000;

interface Props {
  onClose: () => void;
  /** Shrink to the corner and keep going. Without it, Escape closes. */
  onMinimise?: () => void;
  /** From the corner window back to full screen. */
  onExpand?: () => void;
  /** `mini` is the small window in the corner: no key is taken, the pointer still steers it, and it stays while you work. */
  variant?: 'full' | 'mini';
}

/**
 * The cavern, full screen or in the corner: a traveller with a lantern walks and runs through an endless cave painted in light, seen
 * from the side. Right runs faster, left slower, up leaps, down crouches. (The first-person Dive that used to sit beside it was
 * removed on 2026-11-18: grey tiles falling down a square shaft, unrelated to the place.)
 * Steer with the arrow keys or WASD, or with the pointer: a mouse steers by **hovering** over the cave (no click, nothing is
 * captured, moving off it lets go), a finger by holding. Left alone for a few seconds it carries on by itself, and any input
 * hands it back without a jerk. There is no way to lose.
 *
 * It follows the player: the cave is seeded from the song (the same song, the same cave), the light takes the cover's colour, and it
 * slows to a stroll when the music pauses. It is NOT beat-synced unless the person shares audio (Spotify gives a page no audio
 * signal), so nothing here pretends to be a spectrum. Reduced-motion draws one still frame. Escape minimises (or closes); the
 * fullscreen button is the browser's fullscreen on top of this, and leaving it never closes the cave.
 */
export function CavernVisualizer({ onClose, onMinimise, onExpand, variant = 'full' }: Props) {
  const { currentTrack, isPlaying, progressMs, durationMs, togglePlay, nextTrack, prevTrack, seek } = useSpotify();
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const playing = useRef(isPlaying);
  useEffect(() => { playing.current = isPlaying; }, [isPlaying]);
  // The project's journey (its scenes, read by mood) and where the song is, for the loop to read without re-rendering it. The song's
  // progress arrives every few seconds, so the loop carries it forward by the clock between updates.
  const { journey, status } = useJourney();
  const feed = useRef<{ journey: Journey | null; status: JourneyStatus; ms: number; dur: number; at: number }>({ journey: null, status: 'no-project', ms: 0, dur: 0, at: 0 });
  useEffect(() => { feed.current.journey = journey; feed.current.status = status; }, [journey, status]);
  useEffect(() => { feed.current.ms = progressMs; feed.current.dur = durationMs; feed.current.at = performance.now(); }, [progressMs, durationMs]);
  const mini = variant === 'mini';
  // The player's callbacks change identity whenever playback does (and the parent passes inline callbacks): the fullscreen and key
  // handlers read the latest through refs, so re-rendering never re-runs them.
  const latest = useRef({ onClose, onMinimise, togglePlay, mini });
  useEffect(() => { latest.current = { onClose, onMinimise, togglePlay, mini }; }, [onClose, onMinimise, togglePlay, mini]);
  const [idle, setIdle] = useState(false);
  const wake = useCallback(() => setIdle(false), []);

  // Controls and the pointer fade after a few still seconds, so the cave has the screen (full screen only).
  useEffect(() => {
    if (idle || mini) return;
    const t = setTimeout(() => setIdle(true), 3500);
    return () => clearTimeout(t);
  }, [idle, mini]);

  // Fullscreen is the browser's, on top of this overlay (which already covers the window): a button turns it on and off, and leaving
  // it by Escape or the browser's own control leaves the cave where it was.
  const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [fs, setFs] = useState(false);
  const toggleFullscreen = useCallback(() => {
    const el = root.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const el = root.current;
    const onFs = () => setFs(document.fullscreenElement === el);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement === el) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  // A small window in the corner is never fullscreen.
  useEffect(() => { if (mini && document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {}); }, [mini]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (latest.current.mini) return; // the corner window takes no key: the work under it keeps them all
      const typing = e.target instanceof HTMLElement && e.target.closest('button, input, select, textarea, a');
      if (e.key === 'Escape') (latest.current.onMinimise ?? latest.current.onClose)();
      // Space plays or pauses, unless a control has focus: then Space is that control's own key (a second action would also run).
      else if (e.key === ' ' && !typing) { e.preventDefault(); latest.current.togglePlay(); }
      else if ((e.key === 'f' || e.key === 'F') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFullscreen();
      setIdle(false);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [toggleFullscreen]);

  // The world the loop reads: the cave and its seed, the runner, the dive, the light's colour, the held keys. Refs, so a re-render
  // never restarts the loop or the run.
  const trackId = (currentTrack as { id?: string } | null)?.id ?? currentTrack?.name ?? 'cavern';
  const art = currentTrack?.album?.images?.[0]?.url;
  const world = useRef<{
    seed: number; cave: Cave; far: Cave; mid: Cave; runner: Runner | null; tint: Rgb; cover: Rgb; input: Input;
    /** The journey's layout in the cave: the key it was built for, where the song's start sits in x, the sections as zones, and when it was last rebuilt. */
    jkey: string; origin: number; zones: ZoneSegment[] | undefined; resyncedAt: number;
    guide: Input | null; aimedAt: number; mouse: boolean; want: number; settleFrom: number | null;
  }>({
    seed: seedOf(trackId), cave: makeCave(seedOf(trackId)), far: makeCave(seedOf(trackId) + 101), mid: makeCave(seedOf(trackId) + 202), runner: null,
    tint: WARM, cover: WARM, jkey: '', origin: 0, zones: undefined, resyncedAt: -1e9, input: NO_INPUT, guide: null, aimedAt: 0, mouse: false, want: seedOf(trackId), settleFrom: null,
  });
  useEffect(() => { world.current.want = seedOf(trackId); }, [trackId]);

  const kick = useRef<() => void>(() => {});

  // The light takes the cover's colour. A cover the browser will not let us read (cross-origin) leaves the warm default.
  useEffect(() => {
    if (!art) { world.current.cover = WARM; return; }
    let on = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d'); if (!g) return;
        g.drawImage(img, 0, 0, 32, 32);
        if (on) world.current.cover = asLight(dominantColour(g.getImageData(0, 0, 32, 32).data));
      } catch { /* tainted: keep the default */ }
    };
    img.src = art;
    return () => { on = false; };
  }, [art]);

  // Steering: the arrow keys or WASD. A slider or text box keeps its own arrows; the corner window takes none.
  useEffect(() => {
    const keys: Record<string, keyof Input> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
    const own = (e: KeyboardEvent) => e.target instanceof HTMLElement && !!e.target.closest('input, select, textarea');
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = keys[e.key];
      if (!k || latest.current.mini || own(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      world.current.input = { ...world.current.input, [k]: on };
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const clear = () => { world.current.input = NO_INPUT; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);

  // The pointer. A mouse steers by hovering: where it is over the cave is where the figure goes, with no click, no pointer lock and
  // no capture, so it is still a normal pointer for the controls and for leaving. Moving off the cave (onto a control, out of the
  // window) lets go, and so does resting still for a couple of seconds. A finger or pen guides while it is held.
  const aimAt = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const W = world.current, rect = e.currentTarget.getBoundingClientRect(), r = W.runner;
    W.mouse = e.pointerType === 'mouse';
    W.aimedAt = performance.now();
    if (r) W.guide = guideInput(((e.clientX - rect.left) - rect.width * RUNNER_AT) / rect.height, ((e.clientY - rect.top) - r.y * rect.height) / rect.height);
  }, []);
  const letGo = useCallback(() => { world.current.guide = null; }, []);

  // Listening to the computer's sound is opt-in: the browser asks which tab or screen to share, and only then does the cave hear the beat.
  const { toast } = useToast();
  const capture = useRef<Capture | null>(null);
  const [listening, setListening] = useState<'off' | 'starting' | 'on'>('off');
  const canListen = captureSupported();
  const stopListening = useCallback(() => { capture.current?.stop(); capture.current = null; setListening('off'); }, []);
  const startListening = useCallback(async () => {
    setListening('starting');
    try {
      const c = await startCapture();
      c.onEnded(() => { if (capture.current === c) stopListening(); });
      capture.current = c;
      setListening('on');
    } catch (e) {
      setListening('off');
      toast(e instanceof CaptureError ? e.message : 'Could not start listening.', e instanceof CaptureError && e.reason === 'denied' ? 'info' : 'error');
    }
  }, [stopListening, toast]);
  useEffect(() => () => { capture.current?.stop(); capture.current = null; }, []);

  const distance = useRef<HTMLSpanElement>(null);
  const hearing = useRef<HTMLSpanElement>(null);
  const modeText = useRef<HTMLSpanElement>(null);
  const journeyText = useRef<HTMLSpanElement>(null);
  const miniText = useRef<HTMLSpanElement>(null);

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
    const beat = createBeatTracker();
    let heard: Levels = SILENT;
    const size = () => {
      w = c.clientWidth; h = c.clientHeight;
      // Spend pixels carefully: a big screen at a high pixel ratio is drawn at fewer pixels rather than at a stutter.
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.4e6 / Math.max(1, w * h))));
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    // The window changes size when the cave goes to the corner and back, not only when the browser is resized.
    const watcher = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null;
    if (watcher) watcher.observe(c); else window.addEventListener('resize', size);
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const r0 = W.runner!;
      // The journey: where the song is (carried forward by the clock between updates), how long the journey is in the cave, and the x the
      // song says the cave should be at.
      const F = feed.current;
      const frac = F.journey ? songFraction(F.ms + (playing.current ? now - F.at : 0), F.dur) : null;
      const length = F.journey && frac !== null ? journeyLength(F.journey, F.dur) : 0;
      const jkey = F.journey && frac !== null ? `${F.journey.key}@${Math.round(F.dur / 1000)}` : '';
      const lost = jkey !== '' && jkey === W.jkey && now - W.resyncedAt > 3000 && needsResync(r0.x, journeyTarget(frac!, length, W.origin));
      // A new song: a new cave, blended in beyond the edge of the screen so nothing pops.
      if (W.want !== W.seed || jkey !== W.jkey || lost) {
        const from = r0.x + (w / h) * (1 - RUNNER_AT) + 1;
        const newSong = W.want !== W.seed;
        // With a journey the song's start is placed so the song's present moment falls where the new cave begins: a song joined or sought
        // mid-way starts there, and the figure is not sent chasing a section far behind.
        W.origin = jkey ? originFor(from, frac!, length) : 0;
        W.zones = jkey ? journeyZones(F.journey!, length, W.origin) : undefined;
        W.jkey = jkey; W.resyncedAt = now;
        W.cave = blendCaves(W.cave, makeCave(W.want, W.zones), from, 5);
        W.far = blendCaves(W.far, makeCave(W.want + 101), from, 5);
        W.mid = blendCaves(W.mid, makeCave(W.want + 202), from, 5);
        W.seed = W.want;
        W.settleFrom = from + 5 + 0.5;
        if (newSong) {
          spores = makeSpores(70, W.cave, r0.x, AHEAD, W.seed);
        }
      }
      // Once a layer has left the blend fully behind the camera, it is just the new cave again (not a chain of blends).
      if (W.settleFrom !== null) {
        const aspect = w / h;
        const behind = (par: number) => par * r0.x - RUNNER_AT * aspect > W.settleFrom!;
        if (behind(1)) W.cave = makeCave(W.seed, W.zones);
        if (behind(0.6)) W.mid = makeCave(W.seed + 202);
        if (behind(0.3)) { W.far = makeCave(W.seed + 101); W.settleFrom = null; }
      }
      // The light: the scene's mood colour over the cover's, following the figure through the journey.
      if (jkey) W.tint = journeyTint(F.journey!, Math.min(1, Math.max(0, (r0.x - W.origin) / length)), W.cover);
      else W.tint = W.cover;
      // A mouse left resting over the cave lets go.
      if (W.mouse && W.guide && now - W.aimedAt > HOVER_REST_MS) W.guide = null;
      energy += ((playing.current ? 1 : 0.15) - energy) * Math.min(1, dt * 1.5);
      t += dt * (0.25 + energy * 0.75);
      // What it hears, if the person has shared audio: smoothed, so the light breathes with the music instead of strobing.
      const cap = capture.current;
      const raw = cap ? cap.read() : SILENT;
      heard = { bass: smoothLevel(heard.bass, raw.bass, dt), mid: smoothLevel(heard.mid, raw.mid, dt), treble: smoothLevel(heard.treble, raw.treble, dt), level: smoothLevel(heard.level, raw.level, dt) };
      const pulse = cap ? beat.update(raw.bass, dt) : 0;

      if (!reduce) {
        W.runner = stepRunner(r0, dt, W.guide ?? W.input, W.cave, playing.current, jkey ? journeyPace(r0.x, journeyTarget(frac!, length, W.origin)) : 1);
        spores = stepSpores(spores, W.cave, W.runner.x, AHEAD, dt, W.seed);
      }
      const r = W.runner!;
      drawScene(ctx, w, h, { cave: W.cave, far: W.far, mid: W.mid, runner: r, t, energy, tint: W.tint, spores, seed: W.seed, level: heard.level, bass: heard.bass, pulse });
      const steering = !isAuto(r);
      const tally = `${Math.round(r.x * 3).toLocaleString()} m in`;
      if (now - shown > 500) {
        shown = now;
        if (distance.current) distance.current.textContent = tally;
        if (miniText.current) miniText.current.textContent = tally;
        if (hearing.current) hearing.current.textContent = !capture.current ? 'Following the player (the beat is not heard)' : capture.current.hearing() ? 'Listening: the light follows the music' : 'Listening, but hearing nothing: share a tab or the screen with audio, and play something';
        if (journeyText.current) journeyText.current.textContent = describeSync({ status: F.status, journey: F.journey, durationKnown: F.dur > 0, fraction: frac, listening: capture.current !== null }).text;
        if (modeText.current) modeText.current.textContent = steering ? 'You are steering' : 'Exploring on its own: touch an arrow key to steer';
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    kick.current = () => { if (reduce) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } };
    return () => { cancelAnimationFrame(raf); kick.current = () => {}; if (watcher) watcher.disconnect(); else window.removeEventListener('resize', size); };
  }, []);

  const pct = durationMs ? Math.min(100, (progressMs / durationMs) * 100) : 0;
  const fade = idle ? `${v.fade} ${v.faded}` : v.fade;
  const trackLine = currentTrack?.name ?? 'Nothing playing';

  return createPortal(
    <div
      ref={root}
      {...(mini ? { role: 'region', 'aria-label': 'Cavern, in the corner' } : { role: 'dialog', 'aria-modal': true, 'aria-label': 'Cavern visualizer' })}
      onMouseMove={wake} onTouchStart={wake} onClick={wake}
      className={`${v.root} ${mini ? v.mini : ''} ${idle && !mini ? v.idle : ''}`}
    >
      <canvas
        ref={canvas} aria-hidden className={v.canvas}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') e.currentTarget.setPointerCapture?.(e.pointerId); aimAt(e); }}
        onPointerMove={(e) => { if (e.pointerType === 'mouse' || world.current.guide) aimAt(e); }}
        onPointerUp={(e) => { if (e.pointerType !== 'mouse') letGo(); }}
        onPointerCancel={letGo}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') letGo(); }}
      />
      {mini ? (
        <div className={v.miniBar}>
          <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} className={v.miniBtn}>{isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
          <span className={v.miniTitle}>{trackLine}<span ref={miniText} className={v.miniTally} /></span>
          {onExpand && <button type="button" aria-label="Open the cavern full screen" title="Full screen" onClick={onExpand} className={v.miniBtn}><Maximize2 size={14} /></button>}
          <button type="button" aria-label="Close the cavern" title="Close" onClick={onClose} className={v.miniBtn}><X size={14} /></button>
        </div>
      ) : (
        <>
          <div className={`${v.depth} ${fade}`} aria-live="off">
            <span ref={distance}>0 m in</span><span ref={modeText}>Exploring on its own: touch an arrow key to steer</span><span ref={hearing}>Following the player (the beat is not heard)</span><span ref={journeyText}>No project open: the cave follows the player only.</span>
            {canListen && <button type="button" className={v.listen} onClick={() => (listening === 'on' ? stopListening() : void startListening())} disabled={listening === 'starting'} aria-pressed={listening === 'on'}>{listening === 'on' ? <EarOff size={14} /> : <Ear size={14} />} {listening === 'on' ? 'Stop listening' : 'Listen to the music'}</button>}
          </div>
          <div className={`${v.corner} ${fade}`}>
            {canFullscreen && <button type="button" aria-label={fs ? 'Leave fullscreen' : 'Fullscreen'} aria-pressed={fs} title={fs ? 'Leave fullscreen (F)' : 'Fullscreen (F)'} onClick={toggleFullscreen} className={v.btn}>{fs ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>}
            {onMinimise && <button type="button" aria-label="Minimise to the corner" title="Keep it in the corner while you work (Esc)" onClick={onMinimise} className={v.btn}><PictureInPicture2 size={20} /></button>}
            <button type="button" aria-label="Close the visualizer" title="Close" onClick={onClose} className={v.btn}><X size={20} /></button>
          </div>
          <div className={`${v.bar} ${fade}`}>
            <div className={v.row}>
              {art ? <Image src={art} alt="" width={64} height={64} className={v.art} /> : <div className={v.art}><Disc size={26} /></div>}
              <div className={v.meta}>
                <div className={v.title}>{trackLine}</div>
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
        </>
      )}
    </div>,
    document.body,
  );
}
