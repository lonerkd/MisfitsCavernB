import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { renameCharacterInText, renameCue, validCharacterName } from './rename';

const SCRIPT = ['INT. KITCHEN - NIGHT', '', 'MAYA', 'Still up.', '', 'MAYA (V.O.)', 'Always.', '', 'BEN', 'Maya, sleep.', '', 'EXT. PIER - DAY', '', 'MAYA', 'Boats.', ''].join('\n');

describe('renameCue', () => {
  it('keeps the marker and the extension, and only matches the whole name', () => {
    expect(renameCue('MAYA', 'MAYA', 'MIA')).toBe('MIA');
    expect(renameCue('MAYA (V.O.)', 'MAYA', 'MIA')).toBe('MIA (V.O.)');
    expect(renameCue('@Maya', 'MAYA', 'MIA')).toBe('@MIA');
    expect(renameCue('MAYA ^', 'MAYA', 'MIA')).toBe('MIA ^');
    expect(renameCue('MAYAN', 'MAYA', 'MIA')).toBeNull();
    expect(renameCue('BEN', 'MAYA', 'MIA')).toBeNull();
  });
});

describe('renameCharacterInText', () => {
  it('rewrites every cue of the character and nothing else', () => {
    const lines = parseScript(SCRIPT).lines;
    const out = renameCharacterInText(SCRIPT, lines, 'MAYA', 'Mia');
    expect(out.changed).toBe(3);
    expect(out.text.split('\n').filter((l) => l.startsWith('MIA'))).toEqual(['MIA', 'MIA (V.O.)', 'MIA']);
    expect(out.text).toContain('Maya, sleep.');
    expect(out.text).not.toMatch(/^MAYA/m);
  });
  it('reads back as the same character under the new name', () => {
    const lines = parseScript(SCRIPT).lines;
    const out = renameCharacterInText(SCRIPT, lines, 'MAYA', 'MIA');
    const names = parseScript(out.text).characters.map((c) => c.name);
    expect(names).toContain('MIA');
    expect(names).not.toContain('MAYA');
  });
});

describe('validCharacterName', () => {
  it('refuses empty, long and cue-breaking names', () => {
    expect(validCharacterName('  ')).toMatch(/name/);
    expect(validCharacterName('x'.repeat(61))).toMatch(/60/);
    expect(validCharacterName('MIA (V.O.)')).toMatch(/cannot/);
    expect(validCharacterName(' Mia  Rose ')).toBeNull();
  });
});
