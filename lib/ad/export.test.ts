import { describe, expect, it } from 'vitest';
import { describePiece, exportFileName, needsPdfFallback, pdfSafe, pieceToText, setToText, type ExportPiece } from './export';

const piece = (over: Partial<ExportPiece> = {}): ExportPiece => ({
  title: 'Spring radio 30',
  kind: 'spot_30',
  status: 'Client approved',
  content: '# HEADLINE\nFresh start\n\n# VO\nOne two three four five six\n\n# CTA\nBuy now\n',
  maxChars: null,
  maxSeconds: null,
  wordsPerSecond: 2,
  notes: '',
  ...over,
});

describe('describePiece', () => {
  it('lays out the sections that have text, in the editor\'s order, with their friendly names', () => {
    const view = describePiece(piece());
    expect(view.sections.map((s) => s.label)).toEqual(['Headline', 'Voice-over', 'Call to action']);
    expect(view.sections[1].text).toBe('One two three four five six');
    expect(view.status).toBe('Client approved');
  });

  it('has no limit lines when the piece has no limits', () => {
    expect(describePiece(piece()).limits).toEqual([]);
  });

  it('reports characters and spoken time against the limits, and says by how much a piece is over', () => {
    const view = describePiece(piece({ maxChars: 10, maxSeconds: 2 }));
    expect(view.limits[0]).toMatch(/^Characters: \d+ of 10 \(over by \d+\)$/);
    expect(view.limits[1]).toBe('Spoken: 6 words, about 3 s of 2 s (over by 1)');
    const within = describePiece(piece({ maxChars: 500, maxSeconds: 60 }));
    expect(within.limits.join(' ')).not.toContain('over by');
  });

  it('falls back to a plain title and to the raw kind for one it does not know', () => {
    const view = describePiece(piece({ title: '   ', kind: 'carrier_pigeon' }));
    expect(view.title).toBe('Untitled piece');
    expect(view.kindLabel).toBe('carrier_pigeon');
  });
});

describe('text output', () => {
  it('prints one piece: title, kind and status, limits, then each section, then notes', () => {
    const text = pieceToText(describePiece(piece({ notes: ' Client wants it shorter. ', maxSeconds: 30 })));
    expect(text.split('\n')[0]).toBe('Spring radio 30');
    expect(text).toContain('Headline\nFresh start');
    expect(text).toContain('Notes\nClient wants it shorter.');
    expect(text.indexOf('Spoken:')).toBeLessThan(text.indexOf('Headline'));
  });

  it('prints the whole set under a header with the piece count', () => {
    const views = [describePiece(piece()), describePiece(piece({ title: 'Poster' }))];
    const text = setToText('Spring campaign', views, '2026-11-01');
    expect(text.startsWith('Spring campaign\nExported 2026-11-01 · 2 pieces')).toBe(true);
    expect(text).toContain('Poster');
    expect(setToText('', [], '2026-11-01')).toBe('Campaign\nExported 2026-11-01 · 0 pieces');
    expect(setToText('X', [views[0]], '2026-11-01')).toContain('1 piece\n');
  });
});

describe('file names', () => {
  it('makes a safe name for a set and for one piece', () => {
    expect(exportFileName('Spring / Summer 2026!', null, 'txt')).toBe('spring-summer-2026.txt');
    expect(exportFileName('Spring', 'Radio — 30 s', 'pdf')).toBe('spring-radio-30-s.pdf');
  });

  it('never returns an empty base', () => {
    expect(exportFileName('###', '???', 'pdf')).toBe('campaign-piece.pdf');
    expect(exportFileName('', null, 'txt')).toBe('campaign.txt');
  });
});

describe('PDF safety', () => {
  it('keeps Western European text, including curly quotes and the euro sign', () => {
    const text = 'Café “Noël” – 5€\nnew line';
    expect(pdfSafe(text)).toBe(text);
    expect(needsPdfFallback(text)).toBe(false);
  });

  it('replaces what the built-in fonts cannot print and says so', () => {
    expect(pdfSafe('Hello 世界 ✓')).toBe('Hello ?? ?');
    expect(needsPdfFallback('Hello 世界')).toBe(true);
  });

  it('turns tabs into spaces and normalises line endings', () => {
    expect(pdfSafe('a\tb\r\nc')).toBe('a    b\nc');
    expect(needsPdfFallback('a\tb\r\nc')).toBe(false);
  });
});
