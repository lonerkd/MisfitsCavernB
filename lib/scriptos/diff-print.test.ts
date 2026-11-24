import { describe, it, expect } from 'vitest';
import { diffDoc } from './diff-print';
import { printHtml } from '@/lib/print/kit';
import { docToCsv } from '@/lib/print/csv';

const changes = [{ value: 'same\n' }, { value: 'old line\n', removed: true }, { value: 'new <i>line</i>\nmore\n', added: true }];

describe('the printed change list', () => {
  it('counts lines, lists only what changed and escapes the text', () => {
    const doc = diffDoc({ label: 'Blue Revision', changes, generated: 'd' });
    const html = printHtml(doc);
    expect(html).toContain('Changes since Blue Revision');
    expect(html).toContain('old line');
    expect(html).not.toContain('<i>line</i>');
    expect(html).toContain('<dt>Lines added</dt><dd>2</dd>');
    expect(docToCsv(doc)).toContain('Cut,old line');
  });
  it('says so when nothing changed', () => {
    expect(printHtml(diffDoc({ label: 'X', changes: [{ value: 'a\n' }], generated: 'd' }))).toContain('Nothing has changed');
  });
});
