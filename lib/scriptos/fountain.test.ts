import { describe, it, expect } from 'vitest';
import { parseScript } from './parser';

// The Fountain "Brick & Steel" style torture test. Every construct the spec
// defines, in one document, so regressions against the parser show up here.
const SAMPLE = `FADE IN:

EXT. BRICK'S POOL - DAY #1#

A gorgeous day. The sun is shining.

.SNIPER SCOPE POV

_Steel's face FILLS the *Leupold Mark 4* scope_.

STEEL
Beer's ready!

BRICK
Are they cold?

STEEL (beer raised)
To retirement.

STEEL
Screw retirement.
^
BRICK
Screw retirement.

@MAYA
Forced character line.

!THIS IS A FORCED ACTION LINE.

> BRICK BRADDOCK <

> BURN TO PINK.

~Singing a song here

= A synopsis line

# Act One

[[ A note for the writer ]]

/*
this whole block is boneyard
and should be discarded
*/

===

INT. TRAILER HOME - DAY

JACK (in Vietnamese, subtitled)
*Did you know Brick and Steel are retired?*
`;

describe('Fountain conformance', () => {
  const parsed = parseScript(SAMPLE);
  const lines = parsed.lines;
  const line = (needle: string) => lines.find((l) => l.text.trim().includes(needle));

  it('keeps the source lossless (every input line maps to one parsed line)', () => {
    const nonEmpty = SAMPLE.split('\n').filter((l) => l.trim().length > 0);
    const parsedNonEmpty = lines.filter((l) => l.type !== 'empty');
    expect(parsedNonEmpty.length).toBe(nonEmpty.length);
  });

  it('classifies a scene heading and extracts a #…# scene number', () => {
    const s = line('#1#');
    expect(s?.type).toBe('slug');
    expect(s?.meta?.sceneNumber).toBe('1');
  });

  it('strips a leading period from a forced scene heading', () => {
    const scene = parsed.scenes.find((s) => s.heading === 'SNIPER SCOPE POV');
    expect(scene).toBeDefined();
    expect(line('.SNIPER SCOPE POV')?.type).toBe('slug');
  });

  it('treats a character cue with an inline parenthetical as a character', () => {
    const c = line('STEEL (beer raised)');
    expect(c?.type).toBe('character');
    expect(c?.meta?.characterName).toBe('STEEL');
    expect(line('To retirement.')?.type).toBe('dialogue');
  });

  it('records characters into their scene cast list', () => {
    const scene = parsed.scenes.find((s) => s.heading === 'SNIPER SCOPE POV');
    expect(scene?.characters).toEqual(expect.arrayContaining(['STEEL', 'BRICK', 'MAYA']));
  });

  it('handles forced characters (@) and forced action (!) markers', () => {
    expect(line('@MAYA')?.type).toBe('character');
    expect(line('@MAYA')?.meta?.characterName).toBe('MAYA');
    expect(line('FORCED ACTION')?.type).toBe('action');
  });

  it('handles centered text and forced transitions (>)', () => {
    expect(line('BRICK BRADDOCK')?.type).toBe('centered');
    expect(line('BURN TO PINK')?.type).toBe('transition');
    expect(line('FADE IN:')?.type).toBe('transition');
  });

  it('handles lyrics (~), synopses (=), sections (#) and page breaks (===)', () => {
    expect(line('Singing a song')?.type).toBe('lyric');
    expect(line('A synopsis line')?.type).toBe('synopsis');
    expect(line('Act One')?.type).toBe('section');
    expect(lines.find((l) => l.text.trim() === '===')?.type).toBe('pagebreak');
  });

  it('types notes [[ ]] as note rather than action', () => {
    expect(line('A note for the writer')?.type).toBe('note');
  });

  it('discards nothing — boneyard /* */ is typed, not lost, and not action', () => {
    const boneyard = lines.filter((l) => l.text.includes('boneyard') || l.text.trim() === '/*' || l.text.trim() === '*/' || l.text.includes('discarded'));
    expect(boneyard.length).toBeGreaterThan(0);
    expect(boneyard.every((l) => l.type === 'boneyard')).toBe(true);
  });

  it('marks both sides of a dual-dialogue caret (^)', () => {
    expect(line('^')?.type).toBe('dual');
    const dualChars = lines
      .filter((l) => l.type === 'character' && l.meta?.isDualDialogue)
      .map((l) => l.meta?.characterName);
    expect(dualChars).toEqual(expect.arrayContaining(['STEEL', 'BRICK']));
  });

  it('classifies spoken/witness prose as action even when it carries emphasis markers', () => {
    const action = line('Steel\'s face FILLS');
    expect(action?.type).toBe('action');
  });
});