// Mood boards: the pure parts. A board is an arrangement of library items and note cards on a canvas; positions are
// percentages of the board, so it looks the same at any size and prints the same.

export const BOARD_TEMPLATES = ['free', 'character', 'location', 'tone', 'colour'] as const;
export type BoardTemplate = (typeof BOARD_TEMPLATES)[number];

export const TEMPLATE_INFO: Record<BoardTemplate, { label: string; blurb: string; notes: string[] }> = {
  free: { label: 'Free', blurb: 'An empty canvas.', notes: [] },
  character: { label: 'Character', blurb: 'Who they are: look, silhouette, wardrobe, props.', notes: ['Look', 'Silhouette & wardrobe', 'Props they carry'] },
  location: { label: 'Location', blurb: 'Where it happens: the place, the light, the details.', notes: ['The place', 'Light & time of day', 'Details to dress'] },
  tone: { label: 'Tone', blurb: 'How it should feel: references for mood, pace and texture.', notes: ['The feeling', 'Pace & rhythm', 'Texture'] },
  colour: { label: 'Colour', blurb: 'The palette: what to lean on and what to avoid.', notes: ['Lean on', 'Accent', 'Avoid'] },
};

export const isTemplate = (v: string): v is BoardTemplate => (BOARD_TEMPLATES as readonly string[]).includes(v);

export const MIN_W = 5;
export const MAX_W = 100;
export const SIZES = { small: 16, medium: 24, large: 40 } as const;

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A card's top-left corner kept on the board: its width in percent, its height unknown (assume square-ish at `w`). */
export function clampPoint(x: number, y: number, w: number): { x: number; y: number } {
  const width = clamp(w, MIN_W, MAX_W);
  return { x: clamp(x, 0, Math.max(0, 100 - width)), y: clamp(y, 0, 95) };
}

interface Placed { x: number; y: number; w: number }

/** Where a new card goes: the first free slot in a grid of `w`-wide cells, so cards added in a row do not pile up. */
export function nextSpot(existing: readonly Placed[], w: number = SIZES.medium): { x: number; y: number } {
  const gap = 3;
  const cols = Math.max(1, Math.floor((100 - gap) / (w + gap)));
  const cell = w + gap;
  for (let i = 0; i < 200; i++) {
    const spot = { x: gap + (i % cols) * cell, y: gap + Math.floor(i / cols) * cell };
    const taken = existing.some((p) => Math.abs(p.x - spot.x) < cell / 2 && Math.abs(p.y - spot.y) < cell / 2);
    if (!taken) return clampPoint(spot.x, spot.y, w);
  }
  return { x: gap, y: gap };
}

/** The note cards a template starts a board with, laid out in a row. */
export function templateSeed(template: BoardTemplate): Array<{ note: string; x: number; y: number; w: number }> {
  const notes = TEMPLATE_INFO[template].notes;
  const w = 28;
  return notes.map((note, i) => ({ note, x: 3 + i * (w + 3), y: 3, w }));
}

/** Reduce an image's pixels (RGBA bytes) to its most common colours, as hex. Pure, so it can be tested without a canvas. */
export function dominantColours(rgba: ArrayLike<number>, count = 5): string[] {
  const buckets = new Map<number, number>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue; // transparent
    const key = ((rgba[i] >> 5) << 6) | ((rgba[i + 1] >> 5) << 3) | (rgba[i + 2] >> 5);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, count)
    .map(([key]) => {
      const c = [(key >> 6) & 7, (key >> 3) & 7, key & 7].map((v) => Math.min(255, v * 32 + 16));
      return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
    });
}

/** What a board's share link shows: the board, its cards, and for a library item only what shows it. */
export interface SharedBoardItem {
  id: string; x: number; y: number; w: number; z: number; note: string | null;
  /** Annotation pins, oldest first (absent in a link read before pins existed). */
  pins?: { id: string; x: number; y: number; text: string }[];
  media: { id: string; kind: string; title: string; storage_path: string | null; external_url: string | null; mime_type: string | null; width: number | null; height: number | null } | null;
}
export interface SharedBoard { name: string; template: BoardTemplate; project_title: string; items: SharedBoardItem[] }

/** The address of a board's public page. */
export const boardShareUrl = (origin: string, token: string) => `${origin.replace(/\/$/, '')}/b/${token}`;

/** Who sees and edits a board (`mood_boards.access`, enforced by row security, not by this file). */
export const BOARD_ACCESS = ['open', 'view', 'private'] as const;
export type BoardAccess = (typeof BOARD_ACCESS)[number];
export const BOARD_ACCESS_INFO: Record<BoardAccess, { label: string; blurb: string }> = {
  open: { label: 'Everyone on the project edits', blurb: 'Everyone with access to the project sees and edits this board.' },
  view: { label: 'Everyone sees, leads edit', blurb: 'Everyone on the project sees this board; only people who shape the project (owner, leads, contributors) edit it.' },
  private: { label: 'Only leads', blurb: 'Only people who shape the project (owner, leads, contributors) see or edit this board. Others do not see it at all.' },
};
export const isBoardAccess = (v: unknown): v is BoardAccess => typeof v === 'string' && (BOARD_ACCESS as readonly string[]).includes(v);

/** May this person edit the board's cards, pins and settings? (The database makes the same call.) */
export const canEditBoard = (access: string, canShape: boolean): boolean => access === 'open' || canShape;

/** A pin's spot on a card, in percent of the card, kept inside it and rounded to a tenth. */
export function pinPoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 50, y: 50 };
  const f = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
  return { x: f(((clientX - rect.left) / rect.width) * 100), y: f(((clientY - rect.top) / rect.height) * 100) };
}

/** Pins in their reading order (oldest first), each with the number the card and the list show for it. */
export function numberPins<T extends { id: string; created_at: string }>(pins: readonly T[]): Array<T & { n: number }> {
  return [...pins].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)).map((p, i) => ({ ...p, n: i + 1 }));
}

/** How long a new share link lives, in days; null = it never expires. */
export const SHARE_EXPIRY_CHOICES: { days: number | null; label: string }[] = [
  { days: null, label: 'Never expires' },
  { days: 1, label: 'Expires in 1 day' },
  { days: 7, label: 'Expires in 7 days' },
  { days: 30, label: 'Expires in 30 days' },
];

/** The moment a link set to live `days` days from `now` stops working (ISO), or null for no expiry. */
export const shareExpiryFromDays = (days: number | null, now: Date): string | null =>
  days == null ? null : new Date(now.getTime() + days * 86_400_000).toISOString();

/** Is the link without expiry, live, or already dead at `now`? (The database makes the same call, with its own clock.) */
export function shareExpiryState(expiresAt: string | null | undefined, now: Date): 'never' | 'live' | 'expired' {
  if (!expiresAt) return 'never';
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return 'never';
  return t > now.getTime() ? 'live' : 'expired';
}
