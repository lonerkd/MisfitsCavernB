import { describe, it, expect } from 'vitest';
import { crewDoc } from './crew-print';
import { printHtml } from '@/lib/print/kit';

describe('the printed crew list', () => {
  it('lists name, role and status, with how many have confirmed', () => {
    const html = printHtml(crewDoc({ project: 'The Pier', generated: 'd', crew: [{ name: 'sam', role: 'Director', status: 'confirmed', away: null }, { name: 'jordan', role: 'DP', status: 'pending', away: null }, { name: 'riley', role: 'Gaffer', status: null, away: null }] }));
    for (const s of ['sam', 'Director', 'Invited', '<dt>Confirmed</dt><dd>2 of 3</dd>']) expect(html).toContain(s);
    expect(html).not.toContain('>Away<');
  });
  it('adds an Away column only when someone is away, and says so when the crew is empty', () => {
    expect(printHtml(crewDoc({ project: 'P', generated: 'd', crew: [{ name: 'a', role: 'DP', status: 'confirmed', away: '12–14 Mar' }] }))).toContain('12–14 Mar');
    expect(printHtml(crewDoc({ project: 'P', generated: 'd', crew: [] }))).toContain('No one is on the project yet.');
  });
});
