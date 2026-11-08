import { describe, it, expect } from 'vitest';
import { locationsDoc } from './locations-print';
import { printHtml } from '@/lib/print/kit';

const row = (over: object = {}) => ({ name: 'CAIS DO SODRÉ', address: 'Praça do Duque', contact: 'Rui 912 000 000', status: 'Confirmed', permit: 'Permit granted', cost: 500, scenes: [4, 9], days: [1], notes: 'Park north', ...over });
const fmt = (n: number) => `USD ${n}`;

describe('the printed locations list', () => {
  it('lists address and contact, status, permit, cost, and the scenes and days that shoot there, in landscape', () => {
    const doc = locationsDoc({ project: 'The Pier', rows: [row(), row({ name: 'FERRY', status: 'Scouting', cost: null, scenes: [], days: [], address: null, contact: null })], format: fmt, generated: 'd' });
    expect(doc.orientation).toBe('landscape');
    const html = printHtml(doc);
    for (const s of ['CAIS DO SODRÉ', 'Praça do Duque', 'Rui 912 000 000', 'Permit granted', 'USD 500', 'Sc 4, 9', 'Day 1', 'Park north', '<dt>Confirmed</dt><dd>1 of 2</dd>', '<dt>Cost</dt><dd>USD 500</dd>']) expect(html).toContain(s);
  });
  it('says so when there are none', () => {
    const html = printHtml(locationsDoc({ project: 'P', rows: [], format: fmt, generated: 'd' }));
    expect(html).toContain('No locations yet.');
    expect(html).not.toContain('<dt>Cost</dt>');
  });
});
