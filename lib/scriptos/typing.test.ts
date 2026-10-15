import { describe, expect, it } from 'vitest';
import { acceptCompletion, cycleLine, enterInHeading, insertSnippet, suggestionsAt, wrapInParens } from './typing';
import type { LineType } from './types';

describe('insertSnippet', () => {
  it('puts the template at the selection and leaves the caret before its last character', () => {
    const e = insertSnippet('AB', 1, 1, 'transition');
    expect(e.next).toBe('A\n\nCUT TO:\n\nB');
    expect(e.caret).toBe(1 + '\n\nCUT TO:\n\n'.length - 1);
  });
  it('replaces a selection and ignores an unknown type', () => {
    expect(insertSnippet('abc', 0, 3, 'scene').next).toBe('\n\nINT. LOCATION - DAY\n\n');
    expect(insertSnippet('abc', 1, 2, 'nope').next).toBe('ac');
  });
});

describe('acceptCompletion', () => {
  it('replaces the typed token and puts the caret after the suggestion', () => {
    expect(acceptCompletion('MA', { start: 0, end: 2 }, 'MAYA')).toEqual({ next: 'MAYA', caret: 4 });
  });
});

describe('wrapInParens', () => {
  it('wraps the selection, or opens an empty pair', () => {
    expect(wrapInParens('say beat now', 4, 8)).toEqual({ next: 'say (beat) now', caret: 9 });
    expect(wrapInParens('x', 1, 1)).toEqual({ next: 'x()', caret: 2 });
  });
});

describe('enterInHeading', () => {
  it('capitalises a lower-case heading and splits it at the caret', () => {
    expect(enterInHeading('int. kitchen - day', 5)).toEqual({ next: 'INT. \nKITCHEN - DAY', caret: 6 });
  });
  it('leaves a heading already in capitals, and other lines, alone', () => {
    expect(enterInHeading('INT. KITCHEN - DAY', 5)).toBeNull();
    expect(enterInHeading('Maya sits.', 3)).toBeNull();
  });
});

describe('cycleLine', () => {
  const cycle: LineType[] = ['action', 'character', 'dialogue'];
  const transform = (t: string, type: LineType) => `${type}:${t.trim()}`;
  it('moves to the next element type and back with shift', () => {
    expect(cycleLine('Hi', 1, 'action', false, cycle, transform)).toEqual({ next: 'character:Hi', caret: 12 });
    expect(cycleLine('Hi', 1, 'action', true, cycle, transform)).toEqual({ next: 'dialogue:Hi', caret: 11 });
  });
  it('starts from the first type when the current one is unknown', () => {
    expect(cycleLine('Hi', 0, undefined, false, cycle, transform)).toMatchObject({ next: 'character:Hi' });
  });
  it('says "empty" on a blank line between existing content (the editor makes a new scene)', () => {
    expect(cycleLine('A\n\nB', 2, 'action', false, cycle, transform)).toBe('empty');
  });
  it('says "empty" on a wholly blank script (the editor starts one with a scene)', () => {
    expect(cycleLine('', 0, undefined, false, cycle, transform)).toBe('empty');
  });
  it('cycles a blank trailing line after real content, instead of inserting a scene (QA 2026-10-15 #4: action line, Enter, Tab)', () => {
    expect(cycleLine('Action line.\n', 13, 'action', false, cycle, transform)).toEqual({ next: 'Action line.\ncharacter:', caret: 23 });
  });
});

describe('suggestionsAt', () => {
  const known = { slugs: ['INT. KITCHEN - DAY', 'EXT. KIOSK - NIGHT', 'INT. KITCHEN - NIGHT'], characters: ['Maya', 'Marcus', 'Leo'], transitions: ['CUT TO:', 'MATCH CUT TO:'] };
  it('offers known places after INT./EXT., once each', () => {
    const text = 'INT. KI';
    const s = suggestionsAt(text, text.length, known)!;
    expect(s.items).toEqual(['KITCHEN', 'KIOSK']); // KITCHEN is listed once though two headings use it
    expect(text.substring(s.start, s.end)).toBe('KI');
  });
  it('offers characters and transitions for capitals', () => {
    expect(suggestionsAt('MA', 2, known)!.items).toEqual(['Maya', 'Marcus', 'MATCH CUT TO:']);
    expect(suggestionsAt('CU', 2, known)!.items).toEqual(['CUT TO:']);
  });
  it('offers nothing for a complete name, lower case, one letter, or a full stop', () => {
    expect(suggestionsAt('MAYA', 4, known)).toBeNull();
    expect(suggestionsAt('ma', 2, known)).toBeNull();
    expect(suggestionsAt('M', 1, known)).toBeNull();
    expect(suggestionsAt('MA.', 3, known)).toBeNull();
  });
});
