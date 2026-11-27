import { describe, expect, it } from 'vitest';
import { boardCardLine, previewTiles } from './board-preview';
import type { SharedBoardItem } from './boards';

const img = (id: string, path: string | null, kind = 'image'): SharedBoardItem => ({
  id, x: 0, y: 0, w: 20, z: 0, note: null,
  media: { id, kind, title: id, storage_path: path, external_url: null, mime_type: null, width: null, height: null },
});
const note = (id: string): SharedBoardItem => ({ id, x: 0, y: 0, w: 20, z: 0, note: 'hi', media: null });

describe('the link preview', () => {
  it('says how much is on the board and where it is from', () => {
    expect(boardCardLine({ project_title: 'Night Shift', items: [] })).toBe('0 cards · Night Shift');
    expect(boardCardLine({ project_title: 'P', items: [note('a')] })).toBe('1 card · P');
    const pinned = { ...note('b'), pins: [{ id: 'p', x: 1, y: 1, text: 't' }] };
    expect(boardCardLine({ project_title: 'P', items: [note('a'), pinned] })).toBe('2 cards, 1 pin · P');
  });
  it('picks the first library images in order, each once, up to the limit, and never a link or a note', () => {
    const items = [note('n'), img('a', 'p/a.png'), img('b', null), img('c', 'p/c.mov', 'video'), img('d', 'p/a.png'), img('e', 'p/e.png'), img('f', 'p/f.png')];
    expect(previewTiles({ items }, 2)).toEqual(['p/a.png', 'p/e.png']);
    expect(previewTiles({ items }, 10)).toEqual(['p/a.png', 'p/e.png', 'p/f.png']);
    expect(previewTiles({ items: [] }, 4)).toEqual([]);
  });
});
