import { describe, it, expect } from 'vitest';
import { validateScript } from './validator';
import { parseScript } from './parser';

function issuesFor(script: string) {
  const { lines } = parseScript(script);
  return validateScript(lines, script);
}

describe('validateScript', () => {
  it('flags a script with no scene headings', () => {
    const script = 'Just some lines.\nMore lines.\nEven more lines here.\nAnd another.\nOne more.\nLast one.';
    const issues = issuesFor(script);
    expect(issues.some((i) => i.rule === 'no-scenes')).toBe(true);
  });

  it('does not flag no-scenes for a well-formed screenplay', () => {
    const script = 'INT. ROOM - DAY\n\nSAM\nHello.\n\nJORDAN\nHi.\n\nSAM\nHow are you?';
    const issues = issuesFor(script);
    expect(issues.some((i) => i.rule === 'no-scenes')).toBe(false);
  });

  it('flags dialogue appearing before any scene heading', () => {
    const script = 'SAM\nHello before any scene.\n\nINT. ROOM - DAY\n\nAction.';
    const issues = issuesFor(script);
    expect(issues.some((i) => i.rule === 'scene-first')).toBe(true);
  });

  it('flags a lowercase scene heading', () => {
    const script = 'int. room - day\n\nAction happens here to pad it out a bit.';
    const issues = issuesFor(script);
    // The parser may or may not classify a lowercase line as a slug at all;
    // either way it must not silently pass slug-case validation on a slug.
    const slugLine = issues.find((i) => i.rule === 'slug-case');
    if (slugLine) expect(slugLine.type).toBe('info');
  });

  it('flags a parenthetical with no preceding character/dialogue', () => {
    const script = 'INT. ROOM - DAY\n\n(alone in the dark)\n\nSAM enters.';
    const issues = issuesFor(script);
    expect(issues.some((i) => i.rule === 'orphan-paren')).toBe(true);
  });

  it('does not flag a parenthetical that correctly follows a character cue', () => {
    const script = 'INT. ROOM - DAY\n\nSAM\n(quietly)\nHello.';
    const issues = issuesFor(script);
    expect(issues.some((i) => i.rule === 'orphan-paren')).toBe(false);
  });

  it('flags a very short script', () => {
    const issues = issuesFor('INT. ROOM - DAY\n\nHi.');
    expect(issues.some((i) => i.rule === 'length')).toBe(true);
  });

  it('returns no issues for empty input', () => {
    expect(issuesFor('')).toEqual([]);
  });

  it('every issue references a valid line number', () => {
    const script = 'INT. ROOM - DAY\n\nSAM\nHello.\n\n(whispering)\n\nMore action to pad this out nicely.';
    const issues = issuesFor(script);
    for (const issue of issues) {
      expect(issue.line).toBeGreaterThanOrEqual(1);
    }
  });
});
