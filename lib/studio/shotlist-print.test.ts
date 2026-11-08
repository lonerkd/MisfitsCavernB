import { describe, it, expect } from 'vitest';
import { shotListDoc } from './shotlist-print';
import { printHtml } from '@/lib/print/kit';

const shot = (over: object = {}) => ({ scene: 4, number: '4A', size: 'Wide', angle: 'Low', movement: 'dolly', lens: '35mm', description: 'The ferry leaves', status: 'planned', ...over });

describe('the printed shot list', () => {
  it('lists each shot with its scene, size, angle, movement, lens and description, in landscape, with how many are shot', () => {
    const doc = shotListDoc({ project: 'The Pier', filter: null, generated: 'd', shots: [shot(), shot({ number: '4B', status: 'shot', movement: 'static' })] });
    expect(doc.orientation).toBe('landscape');
    const html = printHtml(doc);
    for (const s of ['4A', 'Wide', 'Low', 'dolly', '35mm', 'The ferry leaves', '<dt>Shot</dt><dd>1 of 2</dd>']) expect(html).toContain(s);
    expect(html).not.toContain('static'); // the default movement is not worth a word
    expect(html).not.toContain('<dt>Showing</dt>');
  });
  it('says what a filtered list shows, and says so when empty', () => {
    expect(printHtml(shotListDoc({ project: 'P', filter: 'Status: planned', generated: 'd', shots: [shot()] }))).toContain('<dt>Showing</dt><dd>Status: planned</dd>');
    expect(printHtml(shotListDoc({ project: 'P', filter: null, generated: 'd', shots: [] }))).toContain('No shots on the list.');
  });
});
