import { describe, expect, it } from 'vitest';
import { anchorOverrides } from './override-anchor';
import { parseScript } from './parser';

const SCRIPT = 'INT. ROOM - DAY\n\nMaya waits.\n\nMAYA\nHello.\nShe smiles\nand leaves\n\nBEN\nOK.\n';
const lines = SCRIPT.split('\n');
const at = (needle: string) => lines.findIndex((l) => l.includes(needle));

describe('anchorOverrides', () => {
  it('leaves an override on its line, and one with no saved text, alone', () => {
    const o = [{ line_index: 2, forced_type: 'action', line_text: 'Maya waits.' }, { line_index: 5, forced_type: 'dialogue' }];
    expect(anchorOverrides(lines, o)).toEqual(o);
  });
  it('follows its line when lines are added above it', () => {
    const moved = ['A new line', '', ...lines];
    const res = anchorOverrides(moved, [{ line_index: at('BEN'), forced_type: 'action', line_text: 'BEN' }]);
    expect(res).toEqual([{ line_index: at('BEN') + 2, forced_type: 'action', line_text: 'BEN' }]);
  });
  it('follows its line when lines are removed above it', () => {
    const cut = lines.slice(2);
    const res = anchorOverrides(cut, [{ line_index: at('BEN'), forced_type: 'action', line_text: 'BEN' }]);
    expect(res?.[0].line_index).toBe(at('BEN') - 2);
  });
  it('lets go of an override whose line is gone', () => {
    expect(anchorOverrides(lines, [{ line_index: 3, forced_type: 'action', line_text: 'a line that is no more' }])).toEqual([]);
  });
  it('picks the nearest of two identical lines, and never two overrides on one line', () => {
    const dup = ['MAYA', 'x', 'MAYA', 'y', 'MAYA'];
    const res = anchorOverrides(dup, [{ line_index: 1, forced_type: 'action', line_text: 'MAYA' }, { line_index: 1, forced_type: 'dialogue', line_text: 'MAYA' }]);
    expect(res?.map((r) => r.line_index).sort()).toEqual([0, 2]);
  });
});

describe('the reader uses the anchored override', () => {
  it('a forced type stays on its line after lines are added above', () => {
    const ov = [{ line_index: at('BEN'), forced_type: 'action', line_text: 'BEN' }];
    const base = parseScript(SCRIPT, 'screenplay', undefined, { context: { lineOverrides: ov } as never }).lines;
    expect(base[at('BEN')].type).toBe('action');
    const shifted = '\n\n' + SCRIPT;
    const after = parseScript(shifted, 'screenplay', undefined, { context: { lineOverrides: ov } as never }).lines;
    expect(after[at('BEN') + 2].type).toBe('action');
  });
});
