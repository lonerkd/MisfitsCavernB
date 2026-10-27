import { describe, it, expect } from 'vitest';
import { parseScript } from './parser';
import { serializeFountain, canonicalizeFountain } from './fountain-export';

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

// Structural fingerprint: the things the rest of the suite actually reads.
function fingerprint(content: string) {
  const p = parseScript(content);
  return {
    types: p.lines.filter((l) => l.type !== 'empty').map((l) => l.type),
    scenes: p.scenes.map((s) => ({ heading: s.heading, number: s.sceneNumber, characters: s.characters })),
    characters: p.characters.map((c) => c.name).sort(),
  };
}

function generatedFountain(seed: number): string {
  const pick = <T,>(values: readonly T[], offset: number) => values[(seed * 7 + offset * 11) % values.length];
  const heading = pick(['INT. ROOM - DAY', '.EXT. PIER - NIGHT', '12A INT. KITCHEN - LATER'], 0);
  const first = pick(['MAYA', 'BRICK', 'DR. LEE'], 1);
  const second = pick(['STEEL', 'JOSÉ', 'OFFICER 2'], 2);
  const action = pick(['!THE LIGHTS GO OUT.', 'A lamp flickers.', '_The door_ opens slowly.'], 3);
  const transition = pick(['> CUT TO:', 'FADE OUT.', 'DISSOLVE TO'], 4);
  const speech = pick(['“Stay here.”', 'Don’t move.', 'We can do this.'], 5);
  return [
    `Title: Story ${seed}`,
    'Author: The writer',
    '',
    heading,
    '',
    action,
    '',
    `@${first}`,
    speech,
    '',
    `${second} ^`,
    '(quietly)',
    'I heard that.',
    '',
    '> CENTERED WORDS <',
    '~A short lyric',
    '=The story turns',
    '## Act One',
    '[[Keep this note]]',
    '/* old line',
    'still in the boneyard',
    '*/',
    transition,
    '===',
    'EXT. ROAD - DAWN',
    '',
    `${first}`,
    'We made it.',
    '',
  ].join('\n');
}

describe('Fountain round-trip', () => {
  it('serialize → parse preserves the structural fingerprint', () => {
    const original = fingerprint(SAMPLE);
    const emitted = serializeFountain(parseScript(SAMPLE).lines);
    expect(fingerprint(emitted)).toEqual(original);
  });

  it('canonicalisation is idempotent (a fixed point)', () => {
    const once = canonicalizeFountain(SAMPLE);
    const twice = canonicalizeFountain(once);
    expect(twice).toBe(once);
  });

  it('emits every element in its canonical Fountain form', () => {
    const out = canonicalizeFountain(SAMPLE);
    expect(out).toContain('EXT. BRICK\'S POOL - DAY #1#');
    expect(out).toContain('.SNIPER SCOPE POV');
    expect(out).toContain('STEEL (beer raised)');
    expect(out).toContain('> BRICK BRADDOCK <');
    expect(out).toContain('> BURN TO PINK.');
    expect(out).toContain('~Singing a song here');
    expect(out).toContain('= A synopsis line');
    expect(out).toContain('# Act One');
    expect(out).toContain('[[ A note for the writer ]]');
    expect(out).toContain('===');
    expect(out).toContain('^');
    expect(out).toContain('/* this whole block is boneyard */');
  });

  it('preserves the structural fingerprint across deterministic Fountain variants', () => {
    for (let seed = 0; seed < 32; seed++) {
      const source = generatedFountain(seed);
      const emitted = serializeFountain(parseScript(source).lines);

      expect(fingerprint(emitted), `round-trip seed ${seed}`).toEqual(fingerprint(source));
      const canonical = canonicalizeFountain(source);
      expect(canonicalizeFountain(canonical), `canonical seed ${seed}`).toBe(canonical);
    }
  });

  it('keeps an ALL-CAPS action as action (never falls to character)', () => {
    const out = serializeFountain(parseScript('!THIS IS A FORCED ACTION LINE.').lines);
    expect(out).toBe('!THIS IS A FORCED ACTION LINE.');
    // and it reads back as action, not character
    expect(parseScript(out).lines.find((l) => l.type !== 'empty')?.type).toBe('action');
  });
});