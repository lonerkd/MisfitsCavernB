import { describe, it, expect } from 'vitest';
import { paperworkDoc } from './paperwork-print';
import { printHtml } from '@/lib/print/kit';

describe('the printed paperwork index', () => {
  it('lists each kind with who it is with, its status, expiry and whether a file is attached, then what is still needed first', () => {
    const html = printHtml(paperworkDoc({ project: 'The Pier', generated: 'd', needed: ['Permit for CAIS DO SODRÉ: scenes shoot there'], groups: [
      { label: 'Permits', rows: [{ title: 'Port authority', with: 'Cais do Sodré', status: 'Granted · expires in 9d', expires: '2026-03-20', hasFile: true }, { title: 'Street closure', with: null, status: 'Needed', expires: null, hasFile: false }] },
    ] }));
    for (const s of ['Permits · 2', 'Port authority', 'Granted · expires in 9d', '2026-03-20', '<td class="left">Yes</td>', '<td class="left">No</td>', '<dt>With a file</dt><dd>1 of 2</dd>', '<dt>Still needed</dt><dd>1</dd>', 'Permit for CAIS DO SODRÉ']) expect(html).toContain(s);
    expect(html.indexOf('Still needed')).toBeLessThan(html.indexOf('Permits · 2'));
  });
  it('prints no file contents or links, only that a file exists, and says so when there is nothing', () => {
    const html = printHtml(paperworkDoc({ project: 'P', generated: 'd', needed: [], groups: [{ label: 'Releases', rows: [{ title: 'Maya release', with: 'maya', status: 'Signed', expires: null, hasFile: true }] }] }));
    expect(html).not.toContain('http');
    expect(printHtml(paperworkDoc({ project: 'P', generated: 'd', needed: [], groups: [] }))).toContain('No paperwork yet.');
  });
});
