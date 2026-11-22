// A board as a slideshow: the pure parts. One slide per card, in reading order. The same slides drive the Studio's
// presenter and the shared board page's, so the shared page shows only what the shared-board loader already gave it.

import { readingOrder } from './board-search';
import type { SharedBoard } from './boards';

export interface Slide {
  id: string;
  kind: 'image' | 'note' | 'link';
  title: string;
  /** A note card's text. */
  text?: string;
  /** The picture, for an image. */
  src?: string;
  /** Where "Open" goes, for anything that is not shown in the slide itself. */
  href?: string;
  /** A small line under the picture: the credit, kept in the item's notes. */
  caption?: string;
  /** What a non-image item is: "Video", "Audio", "PDF", "Link". */
  label?: string;
}

const KIND_LABEL: Record<string, string> = { image: 'Image', video: 'Video', audio: 'Audio', document: 'PDF', link: 'Link', note: 'Note' };

interface CardLike {
  id: string; x: number; y: number; note: string | null;
  media: { kind: string; title: string; notes?: string | null; external_url: string | null } | null;
  /** The signed address of the file, when there is one. */
  src: string | null;
}

export function toSlides(cards: readonly CardLike[]): Slide[] {
  return readingOrder(cards).map((c): Slide => {
    const m = c.media;
    if (c.note) return { id: c.id, kind: 'note', title: 'Note', text: c.note };
    if (!m) return { id: c.id, kind: 'note', title: 'Removed', text: 'This library item was removed.' };
    const title = m.title || 'Untitled';
    const caption = m.notes?.trim() || undefined;
    if (m.kind === 'image' && c.src) return { id: c.id, kind: 'image', title, src: c.src, caption };
    return { id: c.id, kind: 'link', title, label: KIND_LABEL[m.kind] ?? 'Item', href: m.external_url || c.src || undefined, caption };
  });
}

/** A shared board's slides. Takes what the loader returned and nothing else. */
export function sharedSlides(board: Pick<SharedBoard, 'items'>, urls: Record<string, string>): Slide[] {
  return toSlides(board.items.map((i) => ({
    id: i.id, x: i.x, y: i.y, note: i.note,
    media: i.media ? { kind: i.media.kind, title: i.media.title, external_url: i.media.external_url } : null,
    src: i.media?.storage_path ? urls[i.media.storage_path] ?? null : i.media?.kind === 'image' ? i.media.external_url : null,
  })));
}

/** Where a step lands: clamped to the ends (a slideshow does not wrap on its own). */
export const stepSlide = (index: number, count: number, dir: 1 | -1): number => Math.min(Math.max(index + dir, 0), Math.max(0, count - 1));

export const AUTO_SECONDS = [3, 5, 10] as const;
