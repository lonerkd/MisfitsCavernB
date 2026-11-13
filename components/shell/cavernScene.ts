// Draws the cavern: layered cave walls, the dark that only the lantern lifts, drifting specks of light, and the runner (a stick-figure
// ninja with a lantern in its right hand). It only draws; the world is lib/cavern/cave.ts, the figure's movement is
// lib/cavern/runner.ts. The cavern is always dark, whatever the theme: it is a room, not a page.
import type { Cave } from '@/lib/cavern/cave';
import type { Rgb } from '@/lib/cavern/palette';
import { heightOf, type Runner } from '@/lib/cavern/runner';
import type { Spore } from '@/lib/cavern/spores';

export interface SceneState {
  cave: Cave;
  /** Two more caves, drawn behind and moving slower, so the place has depth. */
  far: Cave;
  mid: Cave;
  runner: Runner;
  /** Seconds, for flicker and the swing of a scarf. */
  t: number;
  /** 0 asleep (music paused), 1 alive. */
  energy: number;
  /** The light's colour (from the cover). */
  tint: Rgb;
  spores: Spore[];
  /** What the cavern hears, when the person has shared audio (all 0..1; 0 when not listening): the loudness, the low end, and a pulse that is 1 on a beat and falls away. */
  level?: number;
  bass?: number;
  pulse?: number;
}

/** Where on the screen the runner stands, as a fraction of the width: left of centre, so the cave opens ahead of it. */
export const RUNNER_AT = 0.34;

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
const dim = ([r, g, b]: Rgb, k: number): Rgb => [Math.round(r * k), Math.round(g * k), Math.round(b * k)];

interface Pose { feet: [number, number]; hip: [number, number]; neck: [number, number]; head: [number, number]; headR: number; kneeA: [number, number]; footA: [number, number]; kneeB: [number, number]; footB: [number, number]; elbowBack: [number, number]; handBack: [number, number]; shoulder: [number, number]; elbow: [number, number]; hand: [number, number]; lantern: [number, number]; unit: number }

/** The figure's joints for this moment: a run cycle on the ground, a tuck in the air, folded low when crouching. */
export function poseOf(r: Runner, w: number, h: number, t: number): Pose {
  const H = heightOf(r) * h;
  const fx = w * RUNNER_AT, fy = r.y * h;
  const lean = H * (0.1 + r.crouch * 0.16 + (r.grounded ? 0 : 0.04));
  const bob = r.grounded ? Math.abs(Math.sin(r.phase)) * H * 0.035 : 0;
  const hip: [number, number] = [fx, fy - H * 0.48 + bob];
  const neck: [number, number] = [fx + lean, hip[1] - H * 0.32];
  const head: [number, number] = [neck[0] + H * 0.03, neck[1] - H * 0.1];
  const thigh = H * 0.26, shin = H * 0.26;
  const leg = (p: number): { knee: [number, number]; foot: [number, number] } => {
    let a: number, b: number;
    if (r.grounded) { a = Math.sin(p) * (0.85 + r.crouch * 0.2); b = a - (0.55 + 0.75 * Math.max(0, Math.sin(p + 1.4))); }
    else { a = p === r.phase ? 0.95 : -0.15; b = a - 1.2; } // in the air: one knee up, one trailing
    const knee: [number, number] = [hip[0] + Math.sin(a) * thigh, hip[1] + Math.cos(a) * thigh];
    return { knee, foot: [knee[0] + Math.sin(b) * shin, knee[1] + Math.cos(b) * shin] };
  };
  const A = leg(r.phase), B = leg(r.phase + Math.PI);
  const shoulder: [number, number] = [neck[0], neck[1] + H * 0.05];
  const sway = r.grounded ? Math.sin(r.phase) * H * 0.012 : 0;
  // The right arm, the front one, is held out ahead with the lantern, steady against the running.
  const elbow: [number, number] = [shoulder[0] + H * 0.15, shoulder[1] + H * 0.05 + sway];
  const hand: [number, number] = [elbow[0] + H * 0.13, elbow[1] - H * 0.09 + sway * 1.4];
  const swing = r.grounded ? Math.sin(r.phase + Math.PI) : -0.6;
  const elbowBack: [number, number] = [shoulder[0] - H * 0.06 + swing * H * 0.09, shoulder[1] + H * 0.12];
  const handBack: [number, number] = [elbowBack[0] - H * 0.05 + swing * H * 0.1, elbowBack[1] + H * 0.08 - Math.abs(swing) * H * 0.02];
  const lantern: [number, number] = [hand[0] + H * 0.03, hand[1] + H * 0.07 + Math.sin(t * 6 + r.phase) * H * 0.006];
  return { feet: [fx, fy], hip, neck, head, headR: H * 0.075, kneeA: A.knee, footA: A.foot, kneeB: B.knee, footB: B.foot, elbowBack, handBack, shoulder, elbow, hand, lantern, unit: H };
}

function wall(ctx: CanvasRenderingContext2D, cave: Cave, w: number, h: number, cam: number, par: number, squash: number, edge: 'ceiling' | 'floor', fill: string | CanvasGradient | null, stroke?: string | CanvasGradient, line = 2) {
  const step = Math.max(6, Math.round(w / 180));
  const y = (wx: number) => h * 0.5 + ((edge === 'ceiling' ? cave.ceilingAt(wx) : cave.floorAt(wx)) - 0.5) * h * squash;
  ctx.beginPath();
  ctx.moveTo(0, edge === 'ceiling' ? 0 : h);
  for (let sx = 0; sx <= w + step; sx += step) ctx.lineTo(sx, y(((sx - w * RUNNER_AT) / h) + cam * par));
  ctx.lineTo(w + step, edge === 'ceiling' ? 0 : h);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.beginPath();
    for (let sx = 0; sx <= w + step; sx += step) { const yy = y(((sx - w * RUNNER_AT) / h) + cam * par); if (sx === 0) ctx.moveTo(sx, yy); else ctx.lineTo(sx, yy); }
    ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke();
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneState): void {
  const { runner: r, t, energy, tint } = s;
  const cam = r.x;
  const pose = poseOf(r, w, h, t);
  const [lx, ly] = pose.lantern;
  const level = s.level ?? 0, bass = s.bass ?? 0, pulse = s.pulse ?? 0;
  const flicker = 1 + Math.sin(t * 13) * 0.025 + Math.sin(t * 5.3 + 1) * 0.03 + level * 0.14 + bass * 0.1 + pulse * 0.16;
  const radius = h * 0.78 * flicker * (0.5 + 0.5 * energy);

  // The deep background: black, faintly warmed by the light's colour toward the middle.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#020104'); bg.addColorStop(0.5, rgba(dim(tint, 0.1), 1)); bg.addColorStop(1, '#030206');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // The far and middle caves: hazy, slower, shrunk toward the middle of the screen.
  for (const [cave, par, squash, k] of [[s.far, 0.3, 0.8, 0.2], [s.mid, 0.6, 0.9, 0.12]] as const) {
    const rock = rgba(dim(tint, k), 1);
    wall(ctx, cave, w, h, cam, par, squash, 'ceiling', rock, rgba(dim(tint, k * 2.6), 0.8), 1.5);
    wall(ctx, cave, w, h, cam, par, squash, 'floor', rock, rgba(dim(tint, k * 2.6), 0.8), 1.5);
  }

  // The cave the runner runs in: near-black rock with a rim the lantern will find.
  wall(ctx, s.cave, w, h, cam, 1, 1, 'ceiling', '#06040a', rgba(tint, 0.85), 2);
  wall(ctx, s.cave, w, h, cam, 1, 1, 'floor', '#06040a', rgba(tint, 0.85), 2);

  // The dark: everything beyond the lantern's reach is hidden.
  const dark = ctx.createRadialGradient(lx, ly, radius * 0.05, lx, ly, radius * 2);
  dark.addColorStop(0, 'rgba(0, 0, 0, 0)');
  dark.addColorStop(0.3, 'rgba(1, 0, 3, 0.45)');
  dark.addColorStop(0.7, 'rgba(1, 0, 3, 0.86)');
  dark.addColorStop(1, 'rgba(1, 0, 3, 0.95)');
  ctx.fillStyle = dark; ctx.fillRect(0, 0, w, h);

  // The lantern's glow, added to what is there.
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
  glow.addColorStop(0, rgba(tint, Math.min(0.9, 0.34 * (0.35 + 0.65 * energy) + level * 0.12 + pulse * 0.3)));
  glow.addColorStop(0.45, rgba(tint, 0.1 * energy));
  glow.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

  // The lantern finds the rock: faces lit softly, and a bright rim where the beam meets an edge, fading with distance.
  const lit = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.3);
  lit.addColorStop(0, rgba(tint, 0.2 * (0.4 + 0.6 * energy))); lit.addColorStop(1, rgba(tint, 0));
  const rim = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.15);
  rim.addColorStop(0, rgba(tint, 0.95)); rim.addColorStop(0.6, rgba(tint, Math.min(0.9, 0.35 + bass * 0.25 + pulse * 0.3))); rim.addColorStop(1, rgba(tint, 0));
  for (const edge of ['ceiling', 'floor'] as const) {
    wall(ctx, s.cave, w, h, cam, 1, 1, edge, lit, rim, 3);
    wall(ctx, s.cave, w, h, cam, 1, 1, edge, null, lit, 12);
  }

  // Specks of light drifting through the beam.
  for (const p of s.spores) {
    const px = ((p.x - cam) * h) + w * RUNNER_AT + Math.sin(t * 0.8 + p.phase) * 6, py = p.y * h;
    const near = Math.max(0, 1 - Math.hypot(px - lx, py - ly) / (radius * 1.15));
    if (near <= 0) continue;
    ctx.fillStyle = rgba(tint, Math.min(1, (0.1 + near * 0.7) * (0.3 + energy * 0.7) + pulse * 0.2 * near));
    ctx.beginPath(); ctx.arc(px, py, p.size * (1 + near + pulse * 0.6 + (s.level ?? 0) * 0.3), 0, 6.283); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  drawRunner(ctx, pose, r, t, tint);
}

function drawRunner(ctx: CanvasRenderingContext2D, p: Pose, r: Runner, t: number, tint: Rgb) {
  const line = (...pts: Array<[number, number]>) => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.stroke(); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, p.unit * 0.045);
  // lit from the front by its own lantern: a pale figure
  ctx.strokeStyle = 'rgba(236, 224, 205, 0.96)';
  // the scarf, streaming back: it shows how fast it runs
  const tail = Math.min(1, r.speed / 1.4);
  ctx.save(); ctx.lineWidth = Math.max(1.5, p.unit * 0.03); ctx.strokeStyle = rgba(tint, 0.9);
  const sx = p.head[0] - p.headR * 0.5, sy = p.head[1] + p.headR * 0.1;
  line([sx, sy], [sx - p.unit * 0.12 * tail, sy + Math.sin(t * 9) * p.unit * 0.02], [sx - p.unit * 0.24 * tail, sy + Math.sin(t * 9 + 1.3) * p.unit * 0.035 + p.unit * 0.01]);
  ctx.restore();
  line(p.hip, p.kneeB, p.footB);
  line(p.elbowBack, p.handBack); line(p.shoulder, p.elbowBack);
  line(p.hip, p.neck);
  line(p.hip, p.kneeA, p.footA);
  line(p.shoulder, p.elbow, p.hand);
  ctx.beginPath(); ctx.arc(p.head[0], p.head[1], p.headR, 0, 6.283); ctx.stroke();
  // the lantern: a hook, a frame and a flame
  const [lx, ly] = p.lantern;
  ctx.lineWidth = Math.max(1.5, p.unit * 0.02);
  line(p.hand, [lx, ly - p.unit * 0.02]);
  ctx.fillStyle = rgba(tint, 0.95);
  ctx.beginPath(); ctx.arc(lx, ly, p.unit * 0.03, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 220, 0.95)';
  ctx.beginPath(); ctx.arc(lx, ly, p.unit * 0.014, 0, 6.283); ctx.fill();
}
