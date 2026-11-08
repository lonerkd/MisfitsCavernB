import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { readingFormat } from './reading-format';

const PODCAST = `COLD OPEN

HOST: Welcome back to the show.
GUEST: Glad to be here.
[sting]

SEGMENT ONE

HOST: Tell me how you started.
GUEST: By accident, honestly.
`;

const OUTLINE = `00:00 - Opening on the harbour at dawn
Gulls over grey water.
"We never locked a door," says Marta.

INTERVIEW: Marta Ruiz
Marta: "The sea gave and the sea took."

B-ROLL: nets drying on the pier
`;

describe('readingFormat: which rules a script is read with', () => {
  it('maps the formats that have their own rules, and everything else to a screenplay', () => {
    expect(readingFormat('copy')).toBe('copy');
    expect(readingFormat('podcast')).toBe('podcast');
    expect(readingFormat('doc-outline')).toBe('doc-outline');
    for (const f of ['screenplay', 'teleplay', 'stage-play', 'treatment', null, undefined, 'unknown']) expect(readingFormat(f)).toBe('screenplay');
  });
});

describe('a podcast script and an outline read as their own format', () => {
  it('podcast: segment headers are scenes, both speakers are in the cast, their lines are dialogue', () => {
    const own = parseScript(PODCAST, readingFormat('podcast'));
    expect(own.scenes.length).toBe(2);
    expect(own.characters.map((c) => c.name).sort()).toEqual(['GUEST', 'HOST']);
    expect(own.lines.filter((l) => l.type === 'dialogue').length).toBe(4);
    // Read as a screenplay (what the editor did before) it finds no scenes and no speakers.
    const asScreenplay = parseScript(PODCAST, 'screenplay');
    expect(asScreenplay.scenes.length).toBe(0);
    expect(asScreenplay.characters.map((c) => c.name)).not.toContain('GUEST');
  });
  it('outline: timecodes and labels are scenes, quoted soundbites are dialogue', () => {
    const own = parseScript(OUTLINE, readingFormat('doc-outline'));
    expect(own.scenes.length).toBeGreaterThanOrEqual(3);
    expect(own.lines.some((l) => l.type === 'dialogue')).toBe(true);
    expect(parseScript(OUTLINE, 'screenplay').scenes.length).toBe(0);
  });
});
