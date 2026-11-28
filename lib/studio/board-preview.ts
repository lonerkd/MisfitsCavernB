// The text and pictures of a shared board's link preview (its Open Graph card). Pure, so it can be tested.
import type { SharedBoard } from './boards';

/** "Maya's look: 7 cards, 3 pins, from Night Shift" — what the card says under the board's name. */
export function boardCardLine(board: Pick<SharedBoard, 'project_title' | 'items'>): string {
  const cards = board.items.length;
  const pins = board.items.reduce((n, i) => n + (i.pins?.length ?? 0), 0);
  const parts = [`${cards} ${cards === 1 ? 'card' : 'cards'}`];
  if (pins) parts.push(`${pins} ${pins === 1 ? 'pin' : 'pins'}`);
  return `${parts.join(', ')} · ${board.project_title}`;
}

/** Storage paths of up to `max` images on the board, in stacking order (library files only; links are not fetched for a preview). */
export function previewTiles(board: Pick<SharedBoard, 'items'>, max: number): string[] {
  const out: string[] = [];
  for (const i of board.items) {
    const m = i.media;
    // Only formats the preview renderer decodes (png, jpeg, gif): a webp, avif or heic tile would make the whole image fail, so such cards are left out.
    if (m?.kind === 'image' && m.storage_path && /\.(png|jpe?g|gif)$/i.test(m.storage_path) && !out.includes(m.storage_path)) out.push(m.storage_path);
    if (out.length >= max) break;
  }
  return out;
}
