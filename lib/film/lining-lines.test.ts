import { describe, it, expect } from 'vitest';
import { liningLines } from './lining-lines';

describe('liningLines', () => {
  it('drops blank lines and the scene heading, and numbers what the camera covers', () => {
    const out = liningLines([
      { type: 'slug', text: 'INT. KITCHEN - DAY' }, { type: 'empty', text: '' }, { type: 'action', text: ' Maya waits. ' },
      { type: 'character', text: 'MAYA' }, { type: 'dialogue', text: 'You are late.' }, { type: 'action', text: '   ' },
    ]);
    expect(out).toEqual([{ type: 'action', text: 'Maya waits.' }, { type: 'character', text: 'MAYA' }, { type: 'dialogue', text: 'You are late.' }]);
  });
  it('keeps a second heading-like line (only the first heading is the scene)', () => {
    expect(liningLines([{ type: 'slug', text: 'INT. A' }, { type: 'slug', text: 'LATER' }])).toEqual([{ type: 'slug', text: 'LATER' }]);
  });
  it('is empty for no lines', () => {
    expect(liningLines([])).toEqual([]);
  });
});
