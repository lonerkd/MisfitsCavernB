import { describe, it, expect } from 'vitest';
import { revisionsDoc } from './revisions-print';
import { printHtml } from '@/lib/print/kit';

describe('the printed revision history', () => {
  it('lists the locked drafts newest first with their colour and date, and names the latest', () => {
    const html = printHtml(revisionsDoc({ project: 'The Pier', script: 'Pilot', generated: 'd', revisions: [
      { colour: 'White', label: 'First draft', date: '1 Mar 2026' }, { colour: 'Blue', label: 'Production draft', date: '9 Mar 2026' },
    ] }));
    expect(html.indexOf('Production draft')).toBeLessThan(html.indexOf('First draft'));
    for (const s of ['Blue', '<dt>Locked drafts</dt><dd>2</dd>', '<dt>Latest</dt><dd>Blue · 9 Mar 2026</dd>', 'Pilot']) expect(html).toContain(s);
  });
  it('says so when nothing has been locked', () => {
    const html = printHtml(revisionsDoc({ project: 'P', script: 'S', generated: 'd', revisions: [] }));
    expect(html).toContain('No drafts have been locked yet.');
    expect(html).not.toContain('<dt>Latest</dt>');
  });
});
