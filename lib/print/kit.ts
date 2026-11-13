// The print kit: one layout for everything the suite prints or saves as a PDF (owner, 2026-11-08: "almost all tools ... easily
// exported for print in an intuitive, gorgeous file"). A tool describes WHAT it prints as a PrintDoc (a title, some facts, tables,
// sections); the kit decides HOW it looks: one type system, one header and footer, tables that keep their header row on every page and
// never split a row, sections that stay with their heading, a project accent used with restraint, and plain black on white for
// the printer. Pure: returns a complete HTML document, so every tool and the tests read the same rules.
// Saving as a PDF is the browser's print dialog (Save as PDF): the same file, the same layout, nothing to install.

import qrcode from 'qrcode-generator';

export type PrintBlock =
  | { type: 'section'; title: string; blocks: PrintBlock[] }
  | { type: 'text'; text: string; lead?: boolean }
  | { type: 'facts'; items: Array<[label: string, value: string | number | null | undefined]> }
  | { type: 'table'; columns: PrintColumn[]; rows: Array<Record<string, string | number | null | undefined>>; empty?: string; totals?: Record<string, string | number | null | undefined> }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'tags'; items: string[] }
  | { type: 'note'; text: string; tone?: 'info' | 'warn' }
  | { type: 'columns'; columns: PrintBlock[][] }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  /** A QR code for a link (https only), drawn as inline SVG: nothing is fetched, so it prints offline and leaks nothing to a QR service. */
  | { type: 'qr'; url: string; caption?: string }
  | { type: 'pageBreak' };

export interface PrintColumn { key: string; label: string; align?: 'left' | 'right' | 'center'; width?: string }

export interface PrintDoc {
  /** The document's name, which is also the file name when saved as a PDF. */
  title: string;
  /** What kind of document: "Call sheet", "Breakdown", "Portfolio". Shown small above the title. */
  kind: string;
  subtitle?: string;
  /** Facts shown in a strip under the title: ["Date", "12 March 2026"]. */
  meta?: Array<[label: string, value: string | number | null | undefined]>;
  /** The project's accent colour, #rrggbb; anything else falls back to the house colour. */
  accent?: string | null;
  blocks: PrintBlock[];
  /** Left side of the footer, e.g. the project name or a link. */
  footer?: string;
  orientation?: 'portrait' | 'landscape';
  /** Paper size: Letter (the default) or A4. */
  paper?: 'letter' | 'a4';
  /** When the document was made, shown in the footer (given, so the output is the same for the same input). */
  generated?: string;
}

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
/** Text for a CSS string (the page footer): quotes, backslashes and line breaks made harmless. */
export const cssString = (v: string) => `"${v.replace(/[\\"]/g, (c) => `\\${c}`).replace(/[\r\n]+/g, ' ').replace(/[<>&]/g, '')}"`;
/** The QR code for an https link as an SVG (dark squares on white, with the quiet zone a scanner needs); null for anything else or a link too long to encode. */
export function qrSvg(url: string): string | null {
  if (!/^https:\/\/[^\s"'<>]{1,400}$/.test(url)) return null;
  try {
    const q = qrcode(0, 'M');
    q.addData(url);
    q.make();
    const n = q.getModuleCount();
    const quiet = 4;
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    const size = n + quiet * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="84" height="84" role="img" aria-label="QR code for ${esc(url)}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  } catch { return null; }
}

const HOUSE_ACCENT = '#b8320f';

/** A colour only when it is exactly #rrggbb (it goes into a stylesheet); the house colour otherwise. */
export function safeAccent(c: string | null | undefined): string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : HOUSE_ACCENT;
}

/** An image only from an https link (nothing mixed-content, nothing scripted). */
const safeImage = (u: string) => (/^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);

const shown = (v: unknown) => (v === null || v === undefined || v === '' ? '' : esc(v).replace(/\n/g, '<br>'));
const hasValue = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';

function block(b: PrintBlock): string {
  switch (b.type) {
    case 'section':
      return `<section class="sec"><h2>${esc(b.title)}</h2>${b.blocks.map(block).join('')}</section>`;
    case 'text':
      return `<p class="${b.lead ? 'lead' : 'text'}">${esc(b.text).replace(/\n/g, '<br>')}</p>`;
    case 'facts': {
      const items = b.items.filter(([, v]) => hasValue(v));
      return items.length ? `<dl class="facts">${items.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
    }
    case 'table': {
      if (!b.rows.length) return `<p class="empty">${esc(b.empty ?? 'Nothing to list.')}</p>`;
      const head = b.columns.map((c) => `<th class="${c.align ?? 'left'}"${c.width ? ` style="width:${esc(c.width)}"` : ''}>${esc(c.label)}</th>`).join('');
      const body = b.rows.map((r) => `<tr>${b.columns.map((c) => `<td class="${c.align ?? 'left'}">${shown(r[c.key])}</td>`).join('')}</tr>`).join('');
      const foot = b.totals ? `<tfoot><tr>${b.columns.map((c) => `<td class="${c.align ?? 'left'}">${shown(b.totals![c.key])}</td>`).join('')}</tr></tfoot>` : '';
      return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
    }
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return b.items.length ? `<${tag} class="list">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</${tag}>` : '';
    }
    case 'tags':
      return b.items.length ? `<p class="tags">${b.items.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : '';
    case 'note':
      return `<aside class="note ${b.tone === 'warn' ? 'warn' : 'info'}">${esc(b.text)}</aside>`;
    case 'columns':
      return `<div class="cols cols-${b.columns.length}">${b.columns.map((c) => `<div>${c.map(block).join('')}</div>`).join('')}</div>`;
    case 'image': {
      const u = safeImage(b.url);
      return u ? `<figure><img src="${esc(u)}" alt="${esc(b.alt ?? '')}">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>` : '';
    }
    case 'qr': {
      const svg = qrSvg(b.url);
      return svg ? `<figure class="qr">${svg}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>` : '';
    }
    case 'pageBreak':
      return '<div class="pb"></div>';
  }
}

export function printHtml(doc: PrintDoc): string {
  const accent = safeAccent(doc.accent);
  const page = `${doc.paper === 'a4' ? 'A4' : 'Letter'} ${doc.orientation === 'landscape' ? 'landscape' : 'portrait'}`;
  const meta = (doc.meta ?? []).filter(([, v]) => hasValue(v));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
  :root{--ink:#16130f;--soft:#5d574d;--faint:#8b8478;--rule:#d9d3c6;--wash:#f6f2e9;--accent:${accent}}
  *{box-sizing:border-box}
  @page{size:${page};margin:16mm 15mm 20mm;@bottom-left{content:${cssString(doc.footer ?? '')};font:7.5pt -apple-system,Helvetica,Arial,sans-serif;color:#8b8478;vertical-align:top;padding-top:4mm}@bottom-right{content:${cssString(`${doc.generated ? `Made with The Cavern · ${doc.generated} · ` : 'Made with The Cavern · '}`)} "Page " counter(page) " of " counter(pages);font:7.5pt -apple-system,Helvetica,Arial,sans-serif;color:#8b8478;vertical-align:top;padding-top:4mm}}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;color:var(--ink);background:#fff;font:10.5pt/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums}
  header.top{border-bottom:2.5pt solid var(--accent);padding-bottom:10pt;margin-bottom:14pt}
  .kind{font-size:8pt;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 4pt}
  h1{font:700 24pt/1.1 "Iowan Old Style",Charter,Georgia,serif;margin:0;letter-spacing:-.01em;overflow-wrap:anywhere}
  .sub{margin:5pt 0 0;color:var(--soft);font-size:11pt}
  .meta{display:flex;flex-wrap:wrap;gap:4pt 22pt;margin:12pt 0 0;padding:0}
  .meta div{min-width:0}.meta dt{font-size:7.5pt;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}.meta dd{margin:1pt 0 0;font-weight:600}
  h2{font:700 8.5pt/1.2 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 6pt;padding-bottom:3pt;border-bottom:.75pt solid var(--rule)}
  .sec{margin:0 0 15pt;break-inside:auto}.sec>h2{break-after:avoid}
  .lead{font:400 12.5pt/1.5 "Iowan Old Style",Charter,Georgia,serif;margin:0 0 18pt;color:var(--ink)}
  .text{margin:0 0 8pt}
  .facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(120pt,1fr));gap:8pt 18pt;margin:0 0 10pt}
  .facts dt{font-size:7.5pt;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}.facts dd{margin:1pt 0 0;font-weight:600;overflow-wrap:anywhere}
  table{width:100%;border-collapse:collapse;margin:0 0 10pt;font-size:9.5pt}
  thead{display:table-header-group}tfoot{display:table-footer-group}
  th{font-size:7.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);text-align:left;border-bottom:1.25pt solid var(--ink);padding:4pt 6pt}
  td{padding:4.5pt 6pt;border-bottom:.5pt solid var(--rule);vertical-align:top;overflow-wrap:anywhere}
  tr{break-inside:avoid}tbody tr:nth-child(even) td{background:var(--wash)}
  tfoot td{font-weight:700;border-top:1.25pt solid var(--ink);border-bottom:none}
  .right{text-align:right}.center{text-align:center}
  .list{margin:0 0 10pt;padding-left:16pt}.list li{margin:0 0 3pt}
  .tags{display:flex;flex-wrap:wrap;gap:4pt;margin:0 0 10pt}.tags span{border:.75pt solid var(--rule);border-radius:99pt;padding:1.5pt 8pt;font-size:8.5pt;color:var(--soft)}
  .note{border-left:3pt solid var(--accent);background:var(--wash);padding:6pt 10pt;margin:0 0 10pt;break-inside:avoid}.note.warn{border-left-color:#a16207}
  .empty{color:var(--faint);font-style:italic;margin:0 0 10pt}
  .cols{display:grid;gap:0 22pt;margin:0 0 6pt}.cols-2{grid-template-columns:1fr 1fr}.cols-3{grid-template-columns:1fr 1fr 1fr}
  figure{margin:0 0 10pt;break-inside:avoid}figure img{max-width:100%;display:block;border-radius:2pt}figcaption{font-size:8.5pt;color:var(--faint);margin-top:3pt}
  figure.qr{display:inline-block;text-align:center;margin:0 0 10pt}figure.qr svg{display:block}
  .pb{break-after:page}
  footer.foot{display:flex;justify-content:space-between;gap:12pt;border-top:.5pt solid var(--rule);padding-top:4pt;margin-top:24pt;font-size:7.5pt;color:var(--faint)}
  @media print{footer.foot{display:none}}
  @media screen{body{max-width:820px;margin:24px auto;padding:0 28px 60px}}
  </style></head><body>
  <header class="top"><p class="kind">${esc(doc.kind)}</p><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<p class="sub">${esc(doc.subtitle)}</p>` : ''}
  ${meta.length ? `<dl class="meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}</header>
  <main>${doc.blocks.map(block).join('')}</main>
  <footer class="foot"><span>${esc(doc.footer ?? '')}</span><span>${esc(doc.generated ? `Made with The Cavern · ${doc.generated}` : 'Made with The Cavern')}</span></footer>
  </body></html>`;
}
