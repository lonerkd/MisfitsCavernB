import { describe, expect, it } from 'vitest';
import { checkBrandRules } from './brand-rules';
import { characterCount, copyText, estimateSeconds, parseCopy, serializeCopy, spokenWords } from './copy';

describe('copy format', () => {
  it('parses sections, including separate picture and sound columns', () => {
    const blocks = parseCopy('# VISUAL\nA sunrise.\n# VO\nStart your day.\n# SFX\nBirdsong.');
    expect(blocks.VISUAL).toBe('A sunrise.');
    expect(blocks.VO).toBe('Start your day.');
    expect(blocks.SFX).toBe('Birdsong.');
  });

  it('round-trips marked text and preserves plain unmarked copy as body text', () => {
    const source = '# HEADLINE\nFresh from the cave.\n\n# CTA\nVisit today.';
    expect(parseCopy(serializeCopy(parseCopy(source)))).toEqual(parseCopy(source));
    expect(parseCopy('A new line for the body.').BODY).toBe('A new line for the body.');
  });

  it('measures copy without including section markers and estimates spoken time', () => {
    const blocks = parseCopy('# VO\nOne two three four five.\n# VISUAL\nA cave.');
    expect(copyText(blocks)).toBe('A cave.\nOne two three four five.');
    expect(spokenWords(blocks)).toBe(5);
    expect(estimateSeconds(spokenWords(blocks), 2.5)).toBe(2);
    expect(estimateSeconds(5, 0)).toBe(0);
    expect(characterCount('🎬a')).toBe(2);
  });
});

describe('brand rules', () => {
  const rules = [
    { id: 'required', kind: 'must_include' as const, text: 'fresh from the cave', severity: 'blocker' as const },
    { id: 'restricted', kind: 'never_say' as const, text: 'guaranteed cure', severity: 'warning' as const },
    { id: 'tone', kind: 'tone_note' as const, text: 'Sound warm and human', severity: 'note' as const },
  ];

  it('checks required and forbidden phrases literally and case-insensitively', () => {
    expect(checkBrandRules('Fresh from the cave.', rules)).toEqual([]);
    expect(checkBrandRules('Guaranteed cure.', rules)).toMatchObject([
      { ruleId: 'required', kind: 'must_include', severity: 'blocker' },
      { ruleId: 'restricted', kind: 'never_say', severity: 'warning' },
    ]);
  });

  it('does not interpret rule text as regular expressions or report tone guidance as a breach', () => {
    expect(checkBrandRules('Use a [bracket].', [
      { id: 'literal', kind: 'must_include', text: '[bracket]', severity: 'blocker' },
      rules[2],
    ])).toEqual([]);
  });
});
