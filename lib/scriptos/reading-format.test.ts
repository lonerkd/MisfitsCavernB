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

const GAME = `ACT 1: THE HARBOUR
[SET met_ines = false]
Fog sits on the water. A bell rings somewhere.
INES: You are late.
* Apologise
* Ask who she is
[IF met_ines]
INES: We have met.
-> act1_dock

LEVEL 2: THE LIGHTHOUSE
[SFX: a door groans]
`;

const PROSE = `# Why small boats win

Everyone assumes bigger is safer.

THE COST OF SIZE

"Size is a bill you pay every day."

It is also a habit of mind.
`;

const VIDEO = `HOOK
[B-ROLL: a bike rolling down a hill]
What if I told you this bike cost less than lunch?

CHAPTER 1: THE FRAME
HOST: Here is the part nobody shows you.
(to camera)
[GRAPHIC: price breakdown]
Every bolt matters.

OUTRO
Thanks for watching, subscribe for more.
`;

describe('readingFormat: which rules a script is read with', () => {
  it('maps the formats that have their own rules, and everything else to a screenplay', () => {
    expect(readingFormat('copy')).toBe('copy');
    expect(readingFormat('podcast')).toBe('podcast');
    expect(readingFormat('doc-outline')).toBe('doc-outline');
    expect(readingFormat('video-script')).toBe('video-script');
    expect(readingFormat('prose')).toBe('prose');
    expect(readingFormat('game-script')).toBe('game-script');
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

describe('a YouTube / video script reads as its own format', () => {
  const own = parseScript(VIDEO, readingFormat('video-script'));
  it('sections are scenes: the hook, the chapter and the outro', () => {
    expect(own.scenes.length).toBe(3);
  });
  it('bracketed lines are on-screen cues, the spoken words are dialogue, a tagged speaker is in the cast', () => {
    expect(own.lines.filter((l) => l.type === 'shot').length).toBe(2);
    expect(own.lines.filter((l) => l.type === 'parenthetical').length).toBe(1);
    expect(own.lines.filter((l) => l.type === 'dialogue').length).toBe(4);
    expect(own.characters.map((c) => c.name)).toEqual(['HOST']);
  });
  it('read as a screenplay (what an unmapped format got) it finds no sections', () => {
    expect(parseScript(VIDEO, 'screenplay').scenes.length).toBe(0);
  });
});

describe('a game script and an article read as their own formats', () => {
  it('game: parts are scenes, choices are the player\'s lines, logic and jumps are their own lines', () => {
    const own = parseScript(GAME, readingFormat('game-script'));
    expect(own.scenes.length).toBe(2);
    expect(own.characters.map((c) => c.name).sort()).toEqual(['INES', 'PLAYER']);
    expect(own.lines.filter((l) => l.type === 'transition').length).toBe(1);
    expect(own.lines.filter((l) => l.type === 'parenthetical').length).toBe(2);
    expect(own.lines.filter((l) => l.type === 'shot').length).toBe(1);
    expect(parseScript(GAME, 'screenplay').scenes.length).toBe(0);
  });
  it('prose: headings are sections, paragraphs are text, a quote is set apart', () => {
    const own = parseScript(PROSE, readingFormat('prose'));
    expect(own.scenes.length).toBe(2);
    expect(own.lines.filter((l) => l.type === 'action').length).toBe(2);
    expect(own.lines.filter((l) => l.type === 'dialogue').length).toBe(1);
  });
});
