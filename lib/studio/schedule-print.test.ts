import { describe, it, expect } from 'vitest';
import { scheduleDoc } from './schedule-print';
import { printHtml } from '@/lib/print/kit';

const day = (n: number, over: object = {}) => ({ day: n, date: null, pages: '2.0', locations: 1, scenes: [{ number: n, heading: `EXT. PIER ${n}`, kind: 'EXT · DAY', cast: ['MAYA'], pages: '1.0', status: 'planned' }], ...over });

describe('the printed shooting schedule', () => {
  it('prints one table per day that has scenes, in landscape, with the day totals', () => {
    const doc = scheduleDoc({ project: 'The Pier', days: [day(1, { date: 'Thu 12 Mar', locations: 3 }), day(2, { scenes: [] }), day(3)], totalScenes: 2, totalPages: '4.0', generated: 'd' });
    expect(doc).toMatchObject({ kind: 'Schedule', orientation: 'landscape', title: 'Shooting schedule' });
    const html = printHtml(doc);
    expect(html).toContain('Day 1 · Thu 12 Mar · 2.0 pp · 3 locations');
    expect(html).toContain('Day 3 · 2.0 pp');
    expect(html).not.toContain('Day 2');
    expect(html).toContain('size:Letter landscape');
    expect(html).toContain('<dt>Days</dt><dd>2</dd>');
  });
  it('shows a dash for a scene with no cast, and says so when nothing is scheduled', () => {
    expect(printHtml(scheduleDoc({ project: 'P', days: [day(1, { scenes: [{ number: 1, heading: 'INT. X', kind: 'INT · NIGHT', cast: [], pages: '0.5', status: 'planned' }] })], totalScenes: 1, totalPages: '0.5', generated: 'd' }))).toContain('<td class="left">—</td>');
    expect(printHtml(scheduleDoc({ project: 'P', days: [], totalScenes: 0, totalPages: '0.0', generated: 'd' }))).toContain('Nothing is scheduled yet.');
  });
});
