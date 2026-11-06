// A printable page of one board (the browser's Print > Save as PDF): the cards where they sit, images as images.

import type { MoodBoard, MoodBoardItem } from './api';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A src the page may load: https links and the app's own signed URLs only. */
const safeSrc = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : null);

export function boardPrintHtml(board: Pick<MoodBoard, 'name'>, items: readonly MoodBoardItem[], opts: { titleOf: (i: MoodBoardItem) => string; srcOf: (i: MoodBoardItem) => string | null; palette?: string[] }): string {
  const cards = [...items].sort((a, b) => a.z - b.z).map((i) => {
    const src = i.media_id ? safeSrc(opts.srcOf(i)) : null;
    const body = i.note
      ? `<div class="note">${esc(i.note).replace(/\n/g, '<br>')}</div>`
      : src
        ? `<img src="${esc(src)}" alt="${esc(opts.titleOf(i))}"><div class="cap">${esc(opts.titleOf(i))}</div>`
        : `<div class="note">${esc(opts.titleOf(i))}</div>`;
    return `<div class="card" style="left:${i.x}%;top:${i.y}%;width:${i.w}%">${body}</div>`;
  }).join('');
  const swatches = (opts.palette ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).map((c) => `<span class="sw" style="background:${c}"></span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(board.name)}</title><style>
@page{size:A4 landscape;margin:12mm}
body{margin:0;font-family:system-ui,sans-serif;color:#111}
h1{font-size:18px;margin:0 0 8px}
.sw{display:inline-block;width:18px;height:18px;border-radius:4px;margin-right:4px;border:1px solid #ccc}
.board{position:relative;width:100%;aspect-ratio:16/10;border:1px solid #bbb;border-radius:6px;margin-top:8px;overflow:hidden}
.card{position:absolute;background:#fff;border:1px solid #ccc;border-radius:4px;padding:2px;box-sizing:border-box}
.card img{width:100%;display:block;border-radius:3px}
.cap{font-size:9px;color:#555;padding:2px}
.note{font-size:11px;padding:6px;white-space:normal;overflow-wrap:anywhere}
</style></head><body><h1>${esc(board.name)}</h1><div>${swatches}</div><div class="board">${cards}</div></body></html>`;
}
