// Draws the cavern: a cave painted in light. Rock in four depths (filled, not outlined: far and hazy, then nearer and darker), fog
// between them, a lantern that rims and lights the rock it reaches with a beam ahead of it, dust in the air, a wet floor that
// catches the glow, a traveller drawn as a silhouette lit by its own lantern, framing rock in front, a vignette and film grain.
// It only draws; the world is lib/cavern/cave.ts, the figure's movement is lib/cavern/runner.ts. The cavern is always dark,
// whatever the theme: it is a room, not a page. The shadows are the brand's ink-blue (#040710), the light is the cover's colour.
import { hash, type Cave } from '@/lib/cavern/cave';
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
  /** The song's seed: where the stalactites hang is part of the place, so the same song has the same formations. */
  seed?: number;
  /** What the cavern hears, when the person has shared audio (all 0..1; 0 when not listening): the loudness, the low end, and a pulse that is 1 on a beat and falls away. */
  level?: number;
  bass?: number;
  pulse?: number;
}

/** Where on the screen the runner stands, as a fraction of the width: left of centre, so the cave opens ahead of it. */
export const RUNNER_AT = 0.34;

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const NIGHT: Rgb = [4, 7, 16];      // the brand's ink-blue night
const COOL: Rgb = [38, 58, 120];    // the cold light at the far end of the cave
const FAR_ROCK: Rgb = [30, 40, 78];
const MID_ROCK: Rgb = [15, 21, 44];
const NEAR_ROCK: Rgb = [8, 11, 24];
const FRONT_ROCK: Rgb = [3, 4, 10];

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

/** A wall edge as a filled shape (and, when asked, an edge line): the ceiling hangs from the top of the screen, the floor rises from the bottom. */
function wall(ctx: CanvasRenderingContext2D, cave: Cave, w: number, h: number, cam: number, par: number, squash: number, edge: 'ceiling' | 'floor', fill: string | CanvasGradient | null, stroke: string | CanvasGradient | null, line: number, reach = 1): void {
  const step = Math.max(5, Math.round(w / 220));
  // `reach` < 1 pulls the edge toward the screen's border: the framing rock in front only hugs the corners.
  const y = (wx: number) => {
    const e = h * 0.5 + ((edge === 'ceiling' ? cave.ceilingAt(wx) : cave.floorAt(wx)) - 0.5) * h * squash;
    return edge === 'ceiling' ? e * reach : h - (h - e) * reach;
  };
  const x = (sx: number) => ((sx - w * RUNNER_AT) / h) + cam * par;
  if (fill) {
    ctx.beginPath();
    ctx.moveTo(0, edge === 'ceiling' ? 0 : h);
    for (let sx = 0; sx <= w + step; sx += step) ctx.lineTo(sx, y(x(sx)));
    ctx.lineTo(w + step, edge === 'ceiling' ? 0 : h);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  if (stroke) {
    ctx.beginPath();
    for (let sx = 0; sx <= w + step; sx += step) { const yy = y(x(sx)); if (sx === 0) ctx.moveTo(sx, yy); else ctx.lineTo(sx, yy); }
    ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke();
  }
}

/** Where the floor is on the screen at a given x (for the reflection under the lantern). */
const floorY = (cave: Cave, w: number, h: number, cam: number, sx: number) => h * 0.5 + (cave.floorAt(((sx - w * RUNNER_AT) / h) + cam) - 0.5) * h;

/** One depth of rock: ceiling and floor filled in the layer's colour, darkest at the screen's edge, lighter at the rock's face, then the fog that sits in front of it. */
function layer(ctx: CanvasRenderingContext2D, cave: Cave, w: number, h: number, cam: number, par: number, squash: number, rock: Rgb, fog: Rgb, fogAlpha: number, seed: number): void {
  const up = ctx.createLinearGradient(0, 0, 0, h * 0.58);
  up.addColorStop(0, rgba(mix(rock, NIGHT, 0.75), 1)); up.addColorStop(1, rgba(rock, 1));
  wall(ctx, cave, w, h, cam, par, squash, 'ceiling', up, null, 0);
  const down = ctx.createLinearGradient(0, h * 0.42, 0, h);
  down.addColorStop(0, rgba(mix(rock, COOL, 0.12), 1)); down.addColorStop(1, rgba(mix(rock, NIGHT, 0.8), 1));
  wall(ctx, cave, w, h, cam, par, squash, 'floor', down, null, 0);
  formations(ctx, cave, w, h, cam, par, squash, rock, seed);
  if (fogAlpha > 0) {
    const f = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.85);
    f.addColorStop(0, rgba(fog, 0)); f.addColorStop(0.55, rgba(fog, fogAlpha)); f.addColorStop(1, rgba(fog, 0));
    ctx.fillStyle = f; ctx.fillRect(0, 0, w, h);
  }
}

/**
 * Stalactites hanging from the ceiling and stalagmites rising from the floor, at places the song's seed picks (a cell of the world each, some
 * empty), so the rock has the points and drips of a cave and not only rolling edges. They are the rock's own colour, a little lighter at the tip.
 */
function formations(ctx: CanvasRenderingContext2D, cave: Cave, w: number, h: number, cam: number, par: number, squash: number, rock: Rgb, seed: number): void {
  const cell = 0.42;                                    // screen heights of world per cell
  const x0 = (0 - w * RUNNER_AT) / h + cam * par, x1 = (w - w * RUNNER_AT) / h + cam * par;
  const edgeY = (wx: number, edge: 'ceiling' | 'floor') => h * 0.5 + ((edge === 'ceiling' ? cave.ceilingAt(wx) : cave.floorAt(wx)) - 0.5) * h * squash;
  const sxOf = (wx: number) => (wx - cam * par) * h + w * RUNNER_AT;
  for (const edge of ['ceiling', 'floor'] as const) {
    const up = edge === 'floor';
    const tip = rgba(mix(rock, COOL, 0.22), 1), body = rgba(mix(rock, NIGHT, 0.15), 1);
    for (let c = Math.floor(x0 / cell) - 1; c <= Math.ceil(x1 / cell) + 1; c++) {
      const k = (edge === 'ceiling' ? 1000 : 2000) + c;
      if (hash(k, seed ^ 0x5ca1e) < (up ? 0.5 : 0.4)) continue;           // some cells have none
      const wx = (c + 0.2 + hash(k, seed + 1) * 0.6) * cell;
      const len = h * (up ? 0.03 : 0.045) * (0.7 + hash(k, seed + 2) * 1.8) * squash;
      const half = len * (0.18 + hash(k, seed + 3) * 0.14);
      const sx = sxOf(wx), y = edgeY(wx, edge);
      if (!Number.isFinite(sx) || !Number.isFinite(y)) continue;
      const dir = up ? -1 : 1;
      const g = ctx.createLinearGradient(0, y, 0, y + dir * len);
      g.addColorStop(0, body); g.addColorStop(1, tip);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx - half * 1.6, y - dir * 2); ctx.quadraticCurveTo(sx - half * 0.5, y + dir * len * 0.55, sx, y + dir * len);
      ctx.quadraticCurveTo(sx + half * 0.5, y + dir * len * 0.55, sx + half * 1.6, y - dir * 2); ctx.closePath(); ctx.fill();
    }
  }
}

// Film grain: one small tile of noise, made once, laid over the picture a different way each frame (not in a test or with no canvas).
let grainTile: CanvasPattern | null | undefined;
function grain(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (grainTile !== undefined) return grainTile;
  grainTile = null;
  try {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    if (!g) return null;
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = 90 + Math.random() * 120; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    grainTile = ctx.createPattern(c, 'repeat');
  } catch { grainTile = null; }
  return grainTile;
}

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneState): void {
  const { runner: r, t, energy, tint } = s;
  const cam = r.x;
  const pose = poseOf(r, w, h, t);
  const [lx, ly] = pose.lantern;
  const level = s.level ?? 0, bass = s.bass ?? 0, pulse = s.pulse ?? 0;
  const alive = 0.35 + 0.65 * energy;
  const flicker = 1 + Math.sin(t * 13) * 0.025 + Math.sin(t * 5.3 + 1) * 0.03 + level * 0.14 + bass * 0.1 + pulse * 0.16;
  const radius = h * 0.82 * flicker * (0.55 + 0.45 * energy);
  const fog = mix(COOL, tint, 0.16);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  // The deep background: ink-blue night, a haze through the middle, and a far cold light where the cave opens (it breathes with the music).
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, rgba(NIGHT, 1)); bg.addColorStop(0.5, rgba(mix(NIGHT, COOL, 0.32), 1)); bg.addColorStop(1, rgba(NIGHT, 1));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const far = ctx.createRadialGradient(w * 0.84, h * 0.46, 0, w * 0.84, h * 0.46, h * 0.75);
  far.addColorStop(0, rgba(mix(COOL, tint, 0.3), 0.2 + level * 0.12 + pulse * 0.06)); far.addColorStop(1, rgba(COOL, 0));
  ctx.fillStyle = far; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  // Four depths of rock, far to near, each with the fog that sits in front of it so the distance is blue and the nearest is black.
  const seed = s.seed ?? 0;
  layer(ctx, s.far, w, h, cam, 0.3, 0.8, FAR_ROCK, fog, 0.5, seed + 1);
  layer(ctx, s.mid, w, h, cam, 0.6, 0.9, MID_ROCK, fog, 0.28, seed + 2);
  layer(ctx, s.cave, w, h, cam, 1, 1, NEAR_ROCK, fog, 0, seed + 3);
  // Light, added to what is there. First the lantern's glow, then a beam ahead of it that breathes.
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
  glow.addColorStop(0, rgba(tint, Math.min(0.9, 0.42 * alive + level * 0.12 + pulse * 0.3)));
  glow.addColorStop(0.4, rgba(tint, 0.13 * alive));
  glow.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  // The beam ahead of it, breathing with the music: three wedges, each wider and fainter than the last, so its edges are soft.
  const reach = w - lx;
  const strength = Math.min(0.5, 0.2 * alive + level * 0.1 + pulse * 0.16);
  for (const [spread, k] of [[0.07, 0.5], [0.14, 0.3], [0.24, 0.2]] as const) {
    const beam = ctx.createLinearGradient(lx, 0, lx + reach, 0);
    beam.addColorStop(0, rgba(tint, strength * k)); beam.addColorStop(1, rgba(tint, 0));
    ctx.fillStyle = beam;
    const up = (spread + level * 0.02) * h, down = (spread * 1.5 + level * 0.03) * h;
    ctx.beginPath(); ctx.moveTo(lx, ly - h * 0.004); ctx.lineTo(w, ly - up * 1.7); ctx.lineTo(w, ly + down * 1.7); ctx.lineTo(lx, ly + h * 0.004); ctx.closePath(); ctx.fill();
  }

  // The lantern finds the rock: faces lit softly, and a bright rim where the glow meets an edge, fading with distance. The middle rock
  // gets a share, so the light reaches into the depth too.
  const lit = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.3);
  lit.addColorStop(0, rgba(tint, 0.26 * alive)); lit.addColorStop(1, rgba(tint, 0));
  const rim = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.2);
  rim.addColorStop(0, rgba(tint, 0.95)); rim.addColorStop(0.55, rgba(tint, Math.min(0.9, 0.4 + bass * 0.25 + pulse * 0.3))); rim.addColorStop(1, rgba(tint, 0));
  const rimMid = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius * 1.5);
  rimMid.addColorStop(0, rgba(tint, 0.4)); rimMid.addColorStop(1, rgba(tint, 0));
  for (const edge of ['ceiling', 'floor'] as const) {
    wall(ctx, s.mid, w, h, cam, 0.6, 0.9, edge, null, rimMid, 1.6);
    wall(ctx, s.cave, w, h, cam, 1, 1, edge, lit, rim, 3);
    wall(ctx, s.cave, w, h, cam, 1, 1, edge, null, lit, 14);
  }

  // The wet floor: the lantern's glow, mirrored below the edge it stands on.
  const fy = floorY(s.cave, w, h, cam, lx);
  if (Number.isFinite(fy) && fy < h) {
    ctx.save();
    ctx.beginPath(); ctx.rect(Math.max(0, lx - radius), fy, radius * 2, h - fy); ctx.clip();
    ctx.translate(lx, fy + Math.max(0, fy - ly) * 0.3); ctx.scale(1, 0.3);
    const wet = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.7);
    wet.addColorStop(0, rgba(tint, 0.3 * alive + pulse * 0.2)); wet.addColorStop(1, rgba(tint, 0));
    ctx.fillStyle = wet; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  // Dust in the air: faint everywhere, bright in the light, larger on a beat.
  for (const p of s.spores) {
    const px = ((p.x - cam) * h) + w * RUNNER_AT + Math.sin(t * 0.8 + p.phase) * 6, py = p.y * h;
    const near = Math.max(0, 1 - Math.hypot(px - lx, py - ly) / (radius * 1.25));
    ctx.fillStyle = rgba(tint, Math.min(1, (0.05 + near * 0.75) * (0.3 + energy * 0.7) + pulse * 0.2 * near));
    ctx.beginPath(); ctx.arc(px, py, p.size * (1 + near + pulse * 0.6 + level * 0.3), 0, 6.283); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  drawTraveller(ctx, pose, r, t, tint, radius);

  // Rock in front of the figure, hugging the corners and moving faster than anything else: the nearest depth, nearly black.
  wall(ctx, s.mid, w, h, cam, 1.45, 1, 'ceiling', rgba(FRONT_ROCK, 0.96), null, 0, 0.5);
  wall(ctx, s.mid, w, h, cam, 1.45, 1, 'floor', rgba(FRONT_ROCK, 0.96), null, 0, 0.5);

  // The picture's edges fall away, and a little grain keeps the dark from looking like a flat fill.
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.58);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)'); vig.addColorStop(1, 'rgba(0, 0, 4, 0.62)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  const g = grain(ctx);
  if (g) {
    ctx.save();
    ctx.globalAlpha = 0.06; ctx.translate(Math.floor(Math.random() * 128), Math.floor(Math.random() * 128));
    ctx.fillStyle = g; ctx.fillRect(-128, -128, w + 256, h + 256);
    ctx.restore();
  }
}

type Pt = [number, number];
/**
 * A closed shape added to the path being built, always wound the same way (clockwise on the screen, as `arc` is). The whole figure is one
 * path filled non-zero: parts wound opposite ways would cancel where they overlap and leave holes in it.
 */
function poly(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; area += x1 * y2 - x2 * y1; }
  const list = area < 0 ? [...pts].reverse() : pts;
  ctx.moveTo(list[0][0], list[0][1]);
  for (let i = 1; i < list.length; i++) ctx.lineTo(list[i][0], list[i][1]);
  ctx.closePath();
}
/** A limb: a tapered stretch from a to b with rounded ends, added to the path being built. */
function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, wa: number, wb: number): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  poly(ctx, [[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]]);
  ctx.moveTo(a[0] + wa / 2, a[1]); ctx.arc(a[0], a[1], wa / 2, 0, 6.283);
  ctx.moveTo(b[0] + wb / 2, b[1]); ctx.arc(b[0], b[1], wb / 2, 0, 6.283);
}

/** The traveller: a dark silhouette (hood, cloak, boots) lit from the front by its own lantern, with the cloak streaming back as it speeds up. */
function drawTraveller(ctx: CanvasRenderingContext2D, p: Pose, r: Runner, t: number, tint: Rgb, radius: number): void {
  const u = p.unit;
  const [lx, ly] = p.lantern;
  const tail = Math.min(1, r.speed / 1.4);
  // Where it stands, softly: a contact shadow, a little wider than the feet.
  ctx.save();
  ctx.translate(p.feet[0], p.feet[1] + u * 0.012); ctx.scale(1, 0.18);
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 0.32);
  sh.addColorStop(0, 'rgba(0, 0, 0, 0.55)'); sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sh; ctx.fillRect(-u * 0.34, -u * 0.34, u * 0.68, u * 0.68);
  ctx.restore();

  ctx.beginPath();
  // the far leg and arm, then the cloak, the body, the near leg, the head with its hood, the near arm
  limb(ctx, p.hip, p.kneeB, u * 0.1, u * 0.075); limb(ctx, p.kneeB, p.footB, u * 0.075, u * 0.05);
  poly(ctx, [[p.footB[0] - u * 0.02, p.footB[1] - u * 0.03], [p.footB[0] + u * 0.09, p.footB[1] + u * 0.01], [p.footB[0] - u * 0.02, p.footB[1] + u * 0.012]]);
  limb(ctx, p.shoulder, p.elbowBack, u * 0.06, u * 0.045); limb(ctx, p.elbowBack, p.handBack, u * 0.045, u * 0.035);
  const wave = Math.sin(t * 9) * u * 0.03 * (0.4 + tail), wave2 = Math.sin(t * 7 + 1.3) * u * 0.04 * (0.4 + tail);
  poly(ctx, [[p.neck[0] - u * 0.02, p.neck[1] + u * 0.02], [p.neck[0] - u * (0.16 + 0.36 * tail), p.neck[1] + u * 0.1 + wave], [p.hip[0] - u * (0.15 + 0.3 * tail), p.hip[1] + u * 0.12 + wave2], [p.hip[0] + u * 0.03, p.hip[1] + u * 0.09]]);
  limb(ctx, p.neck, p.hip, u * 0.15, u * 0.2);
  limb(ctx, p.hip, p.kneeA, u * 0.1, u * 0.075); limb(ctx, p.kneeA, p.footA, u * 0.075, u * 0.05);
  poly(ctx, [[p.footA[0] - u * 0.02, p.footA[1] - u * 0.03], [p.footA[0] + u * 0.09, p.footA[1] + u * 0.01], [p.footA[0] - u * 0.02, p.footA[1] + u * 0.012]]);
  ctx.moveTo(p.head[0] + p.headR, p.head[1]); ctx.arc(p.head[0], p.head[1], p.headR * 1.12, 0, 6.283);
  poly(ctx, [[p.head[0] - p.headR * 0.9, p.head[1] - p.headR * 0.3], [p.head[0] - p.headR * (1.8 + tail), p.head[1] + p.headR * 0.9], [p.head[0] - p.headR * 0.4, p.head[1] + p.headR * 0.8]]);
  limb(ctx, p.shoulder, p.elbow, u * 0.065, u * 0.05); limb(ctx, p.elbow, p.hand, u * 0.05, u * 0.04);
  poly(ctx, [[lx - u * 0.022, ly - u * 0.04], [lx + u * 0.022, ly - u * 0.04], [lx + u * 0.026, ly + u * 0.03], [lx - u * 0.026, ly + u * 0.03]]);
  ctx.fillStyle = rgba(mix(NIGHT, [14, 12, 22], 0.6), 1); ctx.fill();

  // The lantern lights what is near it: the side facing it warm, the far side left in shadow.
  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const warm = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(radius, u * 1.05));
  warm.addColorStop(0, rgba(tint, 0.7)); warm.addColorStop(0.4, rgba(tint, 0.2)); warm.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = warm; ctx.fillRect(p.feet[0] - u * 1.6, p.feet[1] - u * 1.8, u * 3.6, u * 2);
  ctx.restore();

  // The flame itself, over the frame.
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(tint, 0.95); ctx.beginPath(); ctx.arc(lx, ly, u * 0.034, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255, 246, 224, 0.95)'; ctx.beginPath(); ctx.arc(lx, ly, u * 0.016, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
