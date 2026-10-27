import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';
import { inferDocumentProfile } from './profile';

describe('document profile', () => {
  it('summarizes cue, heading-number, and transition conventions', () => {
    const profile = inferDocumentProfile([
      '12. INT. ROOM - DAY',
      '12A INT. HALL - NIGHT',
      '@Maya',
      'Hello.',
      'FADE OUT.',
      'DISSOLVE TO',
      'CUT TO:',
    ].join('\n'));

    expect(profile.cueNames).toEqual(['MAYA']);
    expect(profile.cueStyle).toBe('title-case');
    expect(profile.cueStyleEvidence).toBe(1);
    expect(profile.headingNumberStyles).toEqual({
      unnumbered: 0,
      number: 0,
      'number-period': 1,
      letter: 1,
      'letter-period': 0,
    });
    expect(profile.transitionEndings).toEqual({ colon: 1, period: 1, bare: 1, other: 0 });
  });

  it('uses forced Fountain cues as document-local evidence for their unmarked form', () => {
    const result = parseScript('INT. ROOM - DAY\n\n@Maya\nHello.\n\n@Leo\nHi.\n\nNora\nAgain.\n');
    const spoken = result.lines.filter((line) => line.type === 'character');

    expect(spoken.map((line) => line.meta?.characterName)).toEqual(['Maya', 'Leo', 'Nora']);
    expect(result.scenes[0].characters).toEqual(['Maya', 'Leo', 'Nora']);
  });

  it('classifies title case per word for multi-word cue anchors', () => {
    const result = parseScript('INT. ROOM - DAY\n\n@Maya Smith\nHello.\n\n@Leo Jones\nHi.\n\nNora\nAgain.\n');

    expect(inferDocumentProfile('@Maya Smith\n@Leo Jones').cueStyle).toBe('title-case');
    expect(result.lines.filter((line) => line.type === 'character').map((line) => line.meta?.characterName))
      .toEqual(['Maya Smith', 'Leo Jones', 'Nora']);
  });

  it('does not treat title-case prose before lowercase action as a cue', () => {
    const result = parseScript('INT. ROOM - DAY\n\n@Maya\nHello.\n\n@Leo\nHi.\n\nThe Door\nopens slowly.\n');

    expect(result.lines.find((line) => line.text === 'The Door')?.type).toBe('action');
    expect(result.characters.map((character) => character.name)).not.toContain('The Door');
    expect(result.scenes[0].characters).not.toContain('The Door');
  });

  it('counts numbered long-form scene headings in the heading style profile', () => {
    const profile = inferDocumentProfile('12. INTERIOR - DAY\n13A EXTERIOR - NIGHT');

    expect(profile.headingNumberStyles).toEqual({
      unnumbered: 0,
      number: 0,
      'number-period': 1,
      letter: 1,
      'letter-period': 0,
    });
  });

  it('does not infer cue style without an explicit cue anchor', () => {
    expect(inferDocumentProfile('INT. ROOM - DAY\n\nMaya\nHello.').cueStyle).toBe('unknown');
    const oneAnchor = parseScript('INT. ROOM - DAY\n\n@Maya\nHello.\n\nNora\nAgain.\n');
    expect(oneAnchor.lines.find((line) => line.text === 'Nora')?.type).toBe('action');
  });
});
