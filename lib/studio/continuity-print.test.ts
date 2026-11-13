import { describe, it, expect } from 'vitest';
import { continuityDoc } from './continuity-print';
import { printHtml } from '@/lib/print/kit';

const day = (label: string, over: object = {}) => ({ label, scenes: [{ number: 4, heading: 'EXT. PIER - DAY', time: 'Morning', looks: [{ character: 'MAYA', look: 'Wet coat' }, { character: 'LUIS', look: '' }] }], ...over });

describe('the printed continuity sheet', () => {
  it('groups scenes by story day with their time and each character’s look, and lists the look changes to check', () => {
    const html = printHtml(continuityDoc({ project: 'The Pier', generated: 'd', warnings: ['MAYA changes coat between scenes 4 and 6.'], days: [day('Story day 1'), day('No story day yet', { scenes: [{ number: 9, heading: 'INT. CABIN', time: '', looks: [] }] })] }));
    for (const s of ['Story day 1', 'Morning', 'MAYA: Wet coat', 'LUIS: (no look noted)', 'Look changes inside one story day', 'MAYA changes coat between scenes 4 and 6.', '<dt>To check</dt><dd>1</dd>', '<dt>Story days</dt><dd>1</dd>']) expect(html).toContain(s);
  });
  it('has no warning section when nothing needs checking, and says so when there are no scenes', () => {
    const html = printHtml(continuityDoc({ project: 'P', generated: 'd', warnings: [], days: [day('Story day 2')] }));
    expect(html).not.toContain('Look changes inside one story day');
    expect(html).not.toContain('<dt>To check</dt>');
    expect(printHtml(continuityDoc({ project: 'P', generated: 'd', warnings: [], days: [] }))).toContain('There are no scenes to track yet.');
  });
});
