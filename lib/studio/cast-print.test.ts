import { describe, it, expect } from 'vitest';
import { castDoc } from './cast-print';
import { printHtml } from '@/lib/print/kit';

describe('the printed cast breakdown', () => {
  it('lists each character, who plays them, their scenes and days, and warns about the uncast', () => {
    const html = printHtml(castDoc({ project: 'The Pier', generated: 'd', rows: [
      { character: 'MAYA', actor: 'ana', scenes: 12, days: [1, 2], arc: 'Learns to leave' },
      { character: 'LUIS', actor: null, scenes: 3, days: [], arc: null },
    ] }));
    for (const s of ['MAYA', 'ana', 'Learns to leave', '1, 2', 'Uncast', '1 character is still uncast.', '<dt>Cast</dt><dd>1 of 2</dd>']) expect(html).toContain(s);
  });
  it('has no warning when everyone is cast, and says so when there are no characters', () => {
    expect(printHtml(castDoc({ project: 'P', generated: 'd', rows: [{ character: 'MAYA', actor: 'ana', scenes: 1, days: [], arc: null }] }))).not.toContain('uncast');
    expect(printHtml(castDoc({ project: 'P', generated: 'd', rows: [] }))).toContain('No characters yet.');
  });
});
