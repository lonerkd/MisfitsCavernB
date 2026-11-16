#!/usr/bin/env node
// Measures screenplay import quality over a local library of PDFs.
//
// The library lives in `.private-corpus/` (git-ignored) and nothing from it is
// written into the repository: this script reads the files, prints measurements,
// and writes its report under `.private-corpus/.reports/` (also ignored).
//
//   node scripts/private-corpus.mjs                 every file
//   node scripts/private-corpus.mjs --limit 20      the first 20
//   node scripts/private-corpus.mjs --file Name.pdf one file
//   node scripts/private-corpus.mjs --json          the report only
//
// Every file is first CLASSIFIED, because a file that cannot be parsed is not a
// parsing failure:
//
//   scanned    no text layer at all — a scan; OCR is the only road in
//   sparse     a line or two per page (page furniture on an image PDF)
//   encoding   text items are garbage codepoints — the font's character map is
//              wrong, so the letters are unreadable even though they are there
//   read       the import ran; the counts below are what it made of the file
//
// For readable files it measures: pages, characters, elements by type, scenes,
// cast, a dash that decoded as something else, a heading the reader could not
// split into place and time, long glued words (an OCR that lost its spaces),
// and the three failure signatures — text with no dialogue, no cast, or no
// scenes.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '.private-corpus');
const REPORTS = path.join(ROOT, '.reports');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const { layoutPages } = await import('../lib/scriptos/pdfLayout.ts').catch(() => import('../lib/scriptos/pdfLayout.js'));
const { parseScript } = await import('../lib/scriptos/parser.ts').catch(() => import('../lib/scriptos/parser.js'));

/** Text items on every page, the way the app gets them from pdf.js. */
async function pdfPages(file) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .filter((it) => typeof it.str === 'string' && it.transform)
        .map((it) => ({ str: it.str, transform: it.transform }))
    );
  }
  return pages;
}

// A dash that decoded as something else. Real PDFs are full of these: the
// separator in "EXT. BEACH - NIGHT" arrives as a low quote or a box.
const ODD_DASH = /[\u201a\u201e\u0082\u0096\u0097\ufffd\u00ad]/;
const HEADINGISH = /^\s*(?:\d+[A-Z]?\s+)?(?:INT|EXT|INTERIOR|EXTERIOR|I\/E|EST)\b/i;

/** How much of the text is unreadable: control codepoints, or private-use boxes. */
function garbageShare(text) {
  const body = text.replace(/\s+/g, '');
  if (!body) return 0;
  let bad = 0;
  for (const ch of body) {
    const c = ch.codePointAt(0);
    if ((c < 0x20 && c !== 0x09) || (c >= 0x80 && c <= 0x9f) || (c >= 0xe000 && c <= 0xf8ff) || c === 0xfffd) bad++;
  }
  return bad / body.length;
}

function measure(name, text, pages) {
  const parsed = parseScript(text);
  const lines = parsed.lines.filter((l) => l.type !== 'empty');
  const counts = {};
  for (const l of lines) counts[l.type] = (counts[l.type] || 0) + 1;
  const raw = text.split('\n').filter((l) => l.trim());
  const headingish = raw.filter((l) => HEADINGISH.test(l));
  // A heading the reader kept whole but could not split into place and time.
  const unsplit = parsed.scenes.filter((s) => !s.timeOfDay && /[-\u2013\u2014]/.test(s.heading)).map((s) => s.heading);
  // Words no reader should ever see: fifteen unbroken letters. An OCR that lost
  // its spaces glues the whole line into one.
  const glued = (text.match(/[A-Za-z]{15,}/g) || []).length;
  const garbage = garbageShare(text);
  // How big the average element came out. A healthy screenplay element is a
  // sentence or two; a document whose markers were lost (no case, no columns,
  // no punctuation) glues whole pages into single paragraphs.
  const avgLine = lines.length ? Math.round(text.replace(/\s+/g, ' ').length / lines.length) : 0;
  // The class, decided before anything is judged: see the header.
  let cls = 'read';
  if (!text.trim()) cls = 'scanned';
  else if (garbage > 0.05) cls = 'encoding';
  else if (pages > 10 && lines.length > 0 && lines.length < pages * 2) cls = 'sparse';
  // The failure signatures, on readable text only.
  const failures = [];
  if (cls === 'read' && lines.length > 50) {
    if (avgLine > 150) failures.push('structure-lost (whole pages glued: no working markers)');
    if (!counts.dialogue) failures.push('no-dialogue');
    if (!parsed.characters.length) failures.push('no-cast');
    if (!parsed.scenes.length) failures.push('no-scenes');
  }
  return {
    file: name,
    pages,
    chars: text.length,
    lines: lines.length,
    counts,
    scenes: parsed.scenes.length,
    headingish: headingish.length,
    cast: parsed.characters.length,
    oddDash: (text.match(new RegExp(ODD_DASH.source, 'g')) || []).length,
    unsplit: unsplit.slice(0, 5),
    unsplitCount: unsplit.length,
    gluedWords: glued,
    garbage: Math.round(garbage * 1000) / 1000,
    avgLine,
    cls,
    failures,
    scanned: cls === 'scanned',
  };
}

async function readOne(name) {
  const file = path.join(ROOT, name);
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const pages = await pdfPages(file);
    return measure(name, layoutPages(pages), pages.length);
  }
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  return measure(name, text, 0);
}

async function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('No .private-corpus/ folder. Nothing to measure.');
    process.exit(1);
  }
  const only = value('--file');
  const limit = Number(value('--limit') || 0);
  let files = fs
    .readdirSync(ROOT)
    .filter((f) => /\.(pdf|fountain|txt)$/i.test(f))
    .sort();
  if (only) files = files.filter((f) => f === only);
  if (limit) files = files.slice(0, limit);

  const results = [];
  for (const name of files) {
    try {
      results.push(await readOne(name));
    } catch (e) {
      results.push({ file: name, error: String(e && e.message ? e.message : e).slice(0, 200), cls: 'error' });
    }
  }

  if (flag('--json')) {
    console.log(JSON.stringify(results, null, 1));
  } else {
    const byClass = (c) => results.filter((r) => r.cls === c);
    for (const r of results) {
      if (r.error) {
        console.log(`${r.file}\n  ERROR ${r.error}`);
        continue;
      }
      const flags = [];
      if (r.oddDash) flags.push(`${r.oddDash} odd dash`);
      if (r.unsplitCount) flags.push(`${r.unsplitCount} unsplit heading`);
      if (r.gluedWords > 20) flags.push(`${r.gluedWords} glued words (OCR lost its spaces)`);
      console.log(
        `[${r.cls}] ${r.file}\n  ${r.pages} pages  ${r.chars} chars  ${r.lines} lines  ` +
          `${r.scenes} scenes (${r.headingish} heading-like)  ${r.cast} cast` +
          (r.failures.length ? `\n  ! ${r.failures.join('; ')}` : '') +
          (flags.length ? `\n  ! ${flags.join('; ')}` : '')
      );
    }

    console.log('\n─── summary ───');
    console.log(`files            ${results.length}`);
    for (const c of ['read', 'sparse', 'encoding', 'scanned', 'error']) {
      console.log(`${c.padEnd(16)} ${byClass(c).length}`);
    }
    const reads = byClass('read');
    const failing = reads.filter((r) => r.failures.length);
    console.log(`readable failing  ${failing.length}`);
    if (reads.length) {
      const totalScenes = reads.reduce((n, r) => n + r.scenes, 0);
      const totalCast = reads.reduce((n, r) => n + r.cast, 0);
      const totalChars = reads.reduce((n, r) => n + r.chars, 0);
      console.log(`total scenes     ${totalScenes}`);
      console.log(`total cast       ${totalCast}`);
      console.log(`total chars      ${totalChars}`);
    }
    for (const c of ['sparse', 'encoding', 'scanned']) {
      const list = byClass(c);
      if (list.length) console.log(`\n${c}: ${list.map((r) => r.file).join(', ')}`);
    }
    if (failing.length) console.log(`\nfailing: ${failing.map((r) => r.file).join(', ')}`);
  }

  fs.mkdirSync(REPORTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(REPORTS, `report-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  if (!flag('--json')) console.log(`\nreport: ${path.relative(process.cwd(), out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
