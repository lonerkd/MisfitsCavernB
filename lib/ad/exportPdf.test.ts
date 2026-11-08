// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describePiece, type ExportPiece } from './export';
import { buildPdf } from './exportPdf';

const piece = (title: string, over: Partial<ExportPiece> = {}): ExportPiece => ({
  title, kind: 'spot_30', status: 'Client approved', maxChars: null, maxSeconds: 30, wordsPerSecond: 2.5, notes: 'Keep it warm.',
  content: '# HEADLINE\nFresh start\n\n# VISUAL\nA kitchen at dawn.\n\n# VO\nOne two three four five six seven eight nine ten.\n\n# CTA\nBuy now\n', ...over,
});

describe('buildPdf', () => {
  it('puts each piece on its own page with a page number footer', async () => {
    const doc = await buildPdf('Spring campaign', [piece('Radio 30'), piece('Poster')].map(describePiece));
    expect(doc.getNumberOfPages()).toBe(2);
    const raw = doc.output();
    expect(raw).toContain('Radio 30');
    expect(raw).toContain('Poster');
    expect(raw).toContain('Spring campaign · page 2 of 2');
    expect(raw).toContain('Fresh start');
  });

  it('runs a long piece onto further pages instead of off the bottom', async () => {
    const long = piece('Long read', { content: `# BODY\n${'A long paragraph of body copy. '.repeat(400)}\n` });
    const doc = await buildPdf('Spring', [describePiece(long)]);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('prints characters the built-in font cannot hold as a question mark rather than garbage', async () => {
    const doc = await buildPdf('Spring', [describePiece(piece('Café 世界'))]);
    expect(doc.output()).toContain('Café ??');
  });

  it('builds an empty set without throwing', async () => {
    const doc = await buildPdf('Empty', []);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
