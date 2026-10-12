// The printed sides: one page per actor, their scenes in shooting order with
// their own speeches in bold. Pure — returns a complete HTML document.

import type { Sides } from './sides';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const LINE_CLASS: Record<string, string> = {
  slug: 'slug', scene: 'slug', character: 'cue', dialogue: 'dlg', parenthetical: 'par', lyric: 'dlg', transition: 'trn', centered: 'ctr',
};

export function sidesHtml(sides: Sides[], opts: { title: string; day: number; date?: string | null; autoprint?: boolean }): string {
  const pages = sides.map((s) => `<section>
    <header><b>${esc(s.character)}</b>${s.actor ? ` · ${esc(s.actor)}` : ''}<span>${esc(opts.title)} — Day ${opts.day}${opts.date ? ` · ${esc(opts.date)}` : ''}${s.call ? ` · call ${esc(s.call)}` : ''}</span></header>
    ${s.scenes.map((sc) => `<div class="scene">${sc.lines.map((l) => `<p class="${LINE_CLASS[l.type] ?? 'act'}${l.mine ? ' mine' : ''}">${esc(l.text)}</p>`).join('')}</div>`).join('')}
  </section>`).join('');
  return `<!doctype html><html><head><title>${esc(opts.title)} — Sides Day ${opts.day}</title><style>
    body{font-family:"Courier Prime","Courier New",monospace;color:#111;margin:0;font-size:12pt;line-height:1.35}
    section{page-break-after:always;padding:36px 56px}section:last-child{page-break-after:auto}
    header{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:11pt;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:18px;display:flex;justify-content:space-between;gap:16px}
    header span{color:#555;font-size:10pt}.scene{margin-bottom:22px}p{margin:0 0 10px}
    .slug{font-weight:700;text-transform:uppercase}.cue{margin-left:2.2in;margin-bottom:0;text-transform:uppercase}.dlg{margin:0 1.2in 10px 1.1in}.par{margin:0 1.6in 0 1.6in}.trn{text-align:right}.ctr{text-align:center}
    .mine{font-weight:700;background:#fff3a3}
  </style></head><body>${pages || '<section><p>No called cast speaks on this day.</p></section>'}${opts.autoprint === false ? '' : '<script>window.onload=()=>{window.print()}</script>'}</body></html>`;
}
