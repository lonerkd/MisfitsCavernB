// Draws the dive: the shaft seen from the blob's own eyes. It only draws; the rules are lib/cavern/dive.ts. Like the runner's cave
// it is always dark, whatever the theme, and takes its light from the cover (the tint) and, when the person shares audio, from the
// music (the pulse flashes the rim and the level breathes the vignette).
import { project, type Dive, type Tile } from '@/lib/cavern/dive';
import type { Rgb } from '@/lib/cavern/palette';

export interface DiveView {
  tint: Rgb;
  /** What the cavern hears, when listening (0..1; 0 otherwise). */
  level?: number;
  pulse?: number;
  /** A small window: fewer flourishes. */
  compact?: boolean;
}

const BASE: Record<Tile['kind'], Rgb> = {
  solid: [150, 156, 168],
  moving: [196, 178, 132],
  fragile: [184, 140, 132],
  spring: [232, 120, 52],
};

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
/** Far tiles sink into the dark. */
const sink = ([r, g, b]: Rgb, fog: number): Rgb => { const k = 1 - fog * 0.85; return [Math.round(r * k), Math.round(g * k), Math.round(b * k)]; };
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];

export function drawDive(ctx: CanvasRenderingContext2D, g: Dive, w: number, h: number, view: DiveView): void {
  const { tint, level = 0, pulse = 0, compact = false } = view;
  const cx = w / 2, cy = h / 2, m = Math.min(w, h);
  const flash = Math.max(g.pulse * 0.6, pulse);

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
  bg.addColorStop(0, '#05060a');
  bg.addColorStop(1, '#0c0b12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // The shaft's walls: square rings that stream past, which is what makes falling feel like falling. They take the cover's colour.
  const f = m * 0.62;
  const ringGap = 3;
  const first = Math.floor((g.y - 0.2) / ringGap) * ringGap;
  ctx.lineWidth = compact ? 1 : 1.5;
  for (let y = first; y > g.y - 36; y -= ringGap) {
    const d = g.y - y;
    if (d < 0.05) continue;
    const half = (9 * f) / (d + 0.7);
    ctx.strokeStyle = rgba(mix([120, 128, 150], tint, 0.35 + flash * 0.4), (0.22 + flash * 0.25) * (1 - Math.min(1, d / 36)));
    ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
  }

  // The tile you will land on (the nearest whose square holds you), lit.
  let under: Tile | null = null;
  for (const t of g.tiles) {
    if (t.y >= g.y || t.broken > 0) continue;
    if (Math.abs(g.x - t.x) <= t.half + 0.28 && Math.abs(g.z - t.z) <= t.half + 0.28) { under = t; break; }
  }

  // Tiles, far to near (the list is kept nearest first).
  for (let i = g.tiles.length - 1; i >= 0; i--) {
    const t = g.tiles[i];
    const p = project(g, t, w, h);
    if (!p || p.size < 1.2 || p.cx + p.size < 0 || p.cx - p.size > w || p.cy + p.size < 0 || p.cy - p.size > h) continue;
    const alpha = t.broken > 0 ? 1 - t.broken : 1;
    if (alpha <= 0) continue;
    const size = p.size * (t.broken > 0 ? 1 + t.broken * 0.25 : 1);
    // A tile right under you is glass: it fills the view as you come down on it, and would hide the next one.
    const glass = Math.min(1, Math.max(0.16, (p.depth - 0.3) / 2.2));
    const lit = t === under;
    const body = t.kind === 'spring' ? mix(BASE.spring, tint, 0.5) : BASE[t.kind];
    ctx.fillStyle = rgba(sink(body, p.fog), alpha * glass);
    ctx.beginPath(); ctx.roundRect(p.cx - size / 2, p.cy - size / 2, size, size, Math.min(size * 0.14, size / 2)); ctx.fill();
    ctx.strokeStyle = lit ? `rgba(255, 255, 255, ${0.9 * alpha})` : rgba(sink([20, 22, 30], p.fog), 0.8 * alpha);
    ctx.lineWidth = lit ? 2 : Math.max(1, size * 0.03);
    ctx.stroke();
    if (size > 16) {
      if (t.kind === 'fragile') {
        ctx.strokeStyle = rgba(sink([40, 30, 30], p.fog), 0.55 * alpha); ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.cx - size * 0.3, p.cy - size * 0.1); ctx.lineTo(p.cx, p.cy + size * 0.05); ctx.lineTo(p.cx + size * 0.25, p.cy - size * 0.28);
        ctx.moveTo(p.cx, p.cy + size * 0.05); ctx.lineTo(p.cx + size * 0.1, p.cy + size * 0.32);
        ctx.stroke();
      } else if (t.kind === 'spring') {
        ctx.strokeStyle = rgba(sink([255, 224, 200], p.fog), 0.85 * alpha); ctx.lineWidth = Math.max(1.5, size * 0.04);
        ctx.beginPath(); ctx.arc(p.cx, p.cy, size * 0.22, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  // Where you will land: a ring at the centre of the view (you are always straight above your own shadow).
  if (under) {
    const p = project(g, under, w, h);
    if (p) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(6, 0.28 * p.k), 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Speed lines when falling hard.
  if (g.vy < -9 && !compact) {
    ctx.strokeStyle = 'rgba(200, 210, 235, 0.16)'; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + g.time * 0.1;
      const r0 = m * (0.28 + ((i * 37) % 11) * 0.02), r1 = r0 + m * 0.18;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
  }

  // The blob's own body at the foot of the view: grey, soft, squashed by each landing.
  const bw = w * 0.34, bh = h * (0.16 - g.pulse * 0.11), by = h + bh * 0.2;
  const body = ctx.createRadialGradient(cx, by, 0, cx, by, bw);
  body.addColorStop(0, 'rgba(150, 152, 160, 0.95)'); body.addColorStop(0.7, 'rgba(110, 112, 122, 0.7)'); body.addColorStop(1, 'rgba(110, 112, 122, 0)');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(cx, by, bw, bh * 1.6, 0, 0, Math.PI * 2); ctx.fill();

  // The edges close in on a landing, and breathe a little with the music.
  const v = ctx.createRadialGradient(cx, cy, m * 0.35, cx, cy, Math.max(w, h) * 0.8);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.85, 0.55 + g.pulse * 0.2 - level * 0.12)})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}
