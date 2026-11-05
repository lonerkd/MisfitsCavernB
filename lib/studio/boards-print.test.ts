import { describe, expect, it } from 'vitest';
import { boardPrintHtml } from './boards-print';
import type { MoodBoardItem } from './api';

const item = (o: Partial<MoodBoardItem>): MoodBoardItem => ({ id: 'i', board_id: 'b', project_id: 'p', media_id: null, note: null, x: 5, y: 5, w: 24, z: 0, created_by: null, created_at: '', updated_at: '', ...o });

describe('boardPrintHtml', () => {
  it('escapes names, notes and titles', () => {
    const html = boardPrintHtml({ name: '<script>x</script>' }, [item({ note: '"><img src=x onerror=alert(1)>' })], { titleOf: () => '', srcOf: () => null });
    expect(html).not.toContain('<script>x');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });
  it('only loads http(s) sources, and shows the title when an image has none', () => {
    const bad = boardPrintHtml({ name: 'B' }, [item({ id: 'a', media_id: 'm' })], { titleOf: () => 'A still', srcOf: () => 'javascript:alert(1)' });
    expect(bad).not.toContain('javascript:');
    expect(bad).toContain('A still');
    const good = boardPrintHtml({ name: 'B' }, [item({ media_id: 'm' })], { titleOf: () => 'T', srcOf: () => 'https://x.test/a.png' });
    expect(good).toContain('src="https://x.test/a.png"');
  });
  it('places cards by percentage, back to front, and keeps only real hex swatches', () => {
    const html = boardPrintHtml({ name: 'B' }, [item({ id: 'a', note: 'front', z: 2, x: 10, y: 20, w: 30 }), item({ id: 'b', note: 'back', z: 1 })], { titleOf: () => '', srcOf: () => null, palette: ['#aabbcc', 'red;x'] });
    expect(html.indexOf('back')).toBeLessThan(html.indexOf('front'));
    expect(html).toContain('left:10%;top:20%;width:30%');
    expect(html).toContain('background:#aabbcc');
    expect(html).not.toContain('red;x');
  });
});
