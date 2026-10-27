import { describe, expect, it } from 'vitest';
import { scriptCharacterNames } from './useScriptCharacters';

describe('script character reads', () => {
  it('uses the shared project context when building the character list', () => {
    const longName = 'THE OLD WOMAN WHO KEEPS THE LAMP AT NIGHT';
    const source = `INT. ROOM - DAY\n\n${longName}\nGood evening.\n\nDARKNESS\nMaya waits.\n`;

    expect(scriptCharacterNames(source, { characters: [longName], rejectedNames: ['DARKNESS'] })).toEqual([longName]);
  });
});
