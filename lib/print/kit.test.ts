import { describe, it, expect } from 'vitest';
import { cssString, printHtml, qrSvg, safeAccent, type PrintDoc } from './kit';

const base: PrintDoc = { title: 'Day 3 — Call sheet', kind: 'Call sheet', blocks: [] };

describe('the print kit', () => {
  it('puts the kind, title, subtitle and meta in the header, and the project in the footer', () => {
    const html = printHtml({ ...base, subtitle: 'The Pier', meta: [['Date', '12 March'], ['Call', '06:30'], ['Empty', ''], ['None', null]], footer: 'The Pier', generated: '8 Nov 2026' });
    expect(html).toContain('<title>Day 3 — Call sheet</title>');
    expect(html).toContain('class="kind">Call sheet');
    expect(html).toContain('<dt>Date</dt><dd>12 March</dd>');
    expect(html).not.toContain('<dt>Empty</dt>');
    expect(html).not.toContain('<dt>None</dt>');
    expect(html).toContain('<span>The Pier</span><span>Made with The Cavern · 8 Nov 2026</span>');
  });

  it('escapes everything a person typed, in every block', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const html = printHtml({ ...base, title: evil, blocks: [
      { type: 'text', text: evil }, { type: 'facts', items: [[evil, evil]] }, { type: 'list', items: [evil] }, { type: 'tags', items: [evil] }, { type: 'note', text: evil },
      { type: 'table', columns: [{ key: 'a', label: evil }], rows: [{ a: evil }], totals: { a: evil } }, { type: 'section', title: evil, blocks: [] },
    ] });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('tables keep a header row, never split a row, and say so when empty', () => {
    const html = printHtml({ ...base, blocks: [
      { type: 'table', columns: [{ key: 'n', label: 'Scene', align: 'right' }, { key: 'h', label: 'Heading' }], rows: [{ n: 1, h: 'INT. KITCHEN' }, { n: 2, h: null }], totals: { n: 2 } },
      { type: 'table', columns: [{ key: 'n', label: 'Scene' }], rows: [], empty: 'No scenes.' },
    ] });
    expect(html).toContain('thead{display:table-header-group}');
    expect(html).toContain('tr{break-inside:avoid}');
    expect(html).toContain('<th class="right">Scene</th>');
    expect(html).toContain('<tr><td class="right">2</td><td class="left"></td></tr>');
    expect(html).toContain('<tfoot>');
    expect(html).toContain('<p class="empty">No scenes.</p>');
  });

  it('a titled table puts its title in the thead, so it repeats on every page the table continues onto', () => {
    const html = printHtml({ ...base, blocks: [
      { type: 'table', title: 'Day 2 · Thu <12>', columns: [{ key: 'n', label: 'Sc' }, { key: 'h', label: 'Scene' }], rows: [{ n: 1, h: 'INT. KITCHEN' }] },
      { type: 'table', title: 'Crew', columns: [{ key: 'n', label: 'Name' }], rows: [], empty: 'No crew.' },
    ] });
    const first = html.indexOf('<section class="sec"><table><thead>');
    expect(first).toBeGreaterThan(-1);
    expect(html).toContain('<thead><tr><th colspan="2" style="border-bottom:0;padding:0 0 2pt"><h2>Day 2 · Thu &lt;12&gt;</h2></th></tr><tr><th class="left">Sc</th><th class="left">Scene</th></tr></thead>');
    // A titled table that is empty keeps its heading and says so, with no empty table.
    expect(html).toContain('<section class="sec"><h2>Crew</h2><p class="empty">No crew.</p></section>');
  });

  it('an untitled table is exactly as it was: no section wrapper, no title row', () => {
    const html = printHtml({ ...base, blocks: [{ type: 'table', columns: [{ key: 'n', label: 'Sc' }], rows: [{ n: 1 }] }] });
    expect(html).toContain('<table><thead><tr><th class="left">Sc</th></tr></thead>');
    expect(html).not.toContain('colspan');
  });

  it('only a #rrggbb accent reaches the stylesheet', () => {
    expect(safeAccent('#12ab9f')).toBe('#12ab9f');
    for (const bad of ['red', 'url(javascript:1)', '#12345', '#12ab9f;}body{display:none', null, undefined]) expect(safeAccent(bad as string | null)).toBe('#b8320f');
    expect(printHtml({ ...base, accent: '#12ab9f;}x{' })).toContain('--accent:#b8320f');
  });

  it('images only from https; facts with no value vanish; paper and orientation set the page', () => {
    const html = printHtml({ ...base, paper: 'a4', orientation: 'landscape', blocks: [
      { type: 'image', url: 'javascript:alert(1)' }, { type: 'image', url: 'http://x.test/a.png' }, { type: 'image', url: 'https://x.test/a.png', alt: 'A', caption: 'Cap' },
      { type: 'facts', items: [['Only', null]] },
    ] });
    expect(html).toContain('size:A4 landscape');
    expect((html.match(/<img /g) ?? [])).toHaveLength(1);
    expect(html).toContain('<figcaption>Cap</figcaption>');
    expect(html).not.toContain('class="facts"');
    expect(printHtml(base)).toContain('size:Letter portrait');
  });

  it('is the same document for the same input', () => {
    expect(printHtml({ ...base, generated: 'x' })).toBe(printHtml({ ...base, generated: 'x' }));
  });

  it('puts the footer and page numbers in the page margin, with the text made safe for a stylesheet', () => {
    const html = printHtml({ ...base, footer: 'The "Pier" \\ <b>x</b>\nline', generated: '8 Nov 2026' });
    expect(html).toContain('@bottom-left{content:"The \\"Pier\\" \\\\ bx/b line"');
    expect(html).toContain('counter(page)');
    expect(html).toContain('counter(pages)');
    expect(cssString('a"b\\c\nd<>&')).toBe('"a\\"b\\\\c d"');
  });
});

describe('the QR block', () => {
  it('draws an https link as inline SVG, a real code of the right size with a quiet zone, and nothing for any other link', () => {
    const html = printHtml({ title: 'T', kind: 'K', blocks: [{ type: 'qr', url: 'https://example.test/u/maya', caption: 'Scan me' }] });
    expect(html).toContain('<svg');
    expect(html).toContain('<figcaption>Scan me</figcaption>');
    expect(html).toMatch(/viewBox="0 0 (\d+) \1"/);
    expect(html).not.toContain('<img'); // nothing is fetched from a QR service
    const bad = printHtml({ title: 'T', kind: 'K', blocks: [{ type: 'qr', url: 'javascript:alert(1)' }, { type: 'qr', url: 'http://insecure.test' }, { type: 'qr', url: 'https://x.test/' + 'a'.repeat(500) }] });
    expect(bad).not.toContain('<svg');
  });
  it('is the same code for the same link, and a different one for another link', () => {
    const a = qrSvg('https://x.test/a'); const b = qrSvg('https://x.test/b');
    expect(a).toBe(qrSvg('https://x.test/a'));
    expect(a).not.toBe(b);
  });
});
