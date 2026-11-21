import { describe, expect, it } from 'vitest';
import { campaignDoc } from './campaign-print';
import { printHtml } from '@/lib/print/kit';
import type { PieceView } from './export';

const view = (title: string, text: string): PieceView => ({ title, kindLabel: '30 s spot', status: 'Client approved', limits: ['Voice-over: 60 of 75 words'], sections: [{ label: 'Voice-over', text }, { label: 'Visual', text: 'A harbour at dawn' }], notes: 'Keep the logo clear' });

describe('campaignDoc', () => {
  it('puts each piece on its own page, with its limits, sections and notes', () => {
    const doc = campaignDoc({ campaign: 'Harbour', views: [view('Spot A', 'Come home'), view('Spot B', 'Stay')], generated: '21 Nov 2026' });
    expect(doc.blocks.filter((b) => b.type === 'pageBreak')).toHaveLength(1);
    const html = printHtml(doc);
    for (const s of ['Spot A', 'Spot B', 'Voice-over: 60 of 75 words', 'A harbour at dawn', 'Keep the logo clear', 'Client approved']) expect(html).toContain(s);
  });
  it('carries the project colour and logo, and prints any language as written', () => {
    const html = printHtml(campaignDoc({ campaign: 'ハーバー', views: [view('スポット', 'おかえりなさい')], accent: '#0f766e', logo: 'https://cdn.test/logo.png', generated: 'x' }));
    expect(html).toContain('#0f766e');
    expect(html).toContain('https://cdn.test/logo.png');
    expect(html).toContain('おかえりなさい');
    expect(html).not.toContain('?');
  });
  it('a single piece is titled by the piece, a set by the campaign; none says so', () => {
    expect(campaignDoc({ campaign: 'Harbour', views: [view('Spot A', 'x')], generated: 'x' }).title).toBe('Spot A');
    expect(campaignDoc({ campaign: 'Harbour', views: [view('A', 'x'), view('B', 'y')], generated: 'x' }).title).toBe('Harbour deliverables');
    expect(printHtml(campaignDoc({ campaign: 'Harbour', views: [], generated: 'x' }))).toContain('No deliverables yet.');
  });
});
