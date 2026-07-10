import { describe, it, expect } from 'vitest';
import { parseScript } from './parser';

const SAMPLE = `FADE IN:

INT. COFFEE SHOP - DAY

SAM sits at a corner table, laptop open. The espresso machine HISSES.

SAM
(without looking up)
You're late again.

JORDAN
Traffic. I swear.

SAM (CONT'D)
That's what you said Tuesday.

EXT. PARKING LOT - NIGHT

Jordan RUNS to a beat-up CAR, keys jangling.

CUT TO:

INT. CAR - CONTINUOUS

Rain hammers the windshield.

FADE OUT.`;

describe('parseScript (screenplay)', () => {
  const result = parseScript(SAMPLE);

  it('returns lines, scenes, and characters', () => {
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.characters.length).toBeGreaterThan(0);
  });

  it('detects all three scene headings', () => {
    expect(result.scenes).toHaveLength(3);
    const headings = result.scenes.map(s => s.heading);
    expect(headings[0]).toContain('COFFEE SHOP');
    expect(headings[1]).toContain('PARKING LOT');
    expect(headings[2]).toContain('CAR');
  });

  it('extracts location and time of day from slugs', () => {
    expect(result.scenes[0].timeOfDay).toMatch(/DAY/i);
    expect(result.scenes[1].timeOfDay).toMatch(/NIGHT/i);
    expect(result.scenes[2].timeOfDay).toMatch(/CONTINUOUS/i);
  });

  it('classifies slug lines as scene headings', () => {
    const slug = result.lines.find(l => l.text.startsWith('INT. COFFEE SHOP'));
    expect(slug).toBeDefined();
    expect(['slug', 'scene']).toContain(slug!.type);
  });

  it('identifies SAM and JORDAN as characters', () => {
    const names = result.characters.map(c => c.name.toUpperCase());
    expect(names).toContain('SAM');
    expect(names).toContain('JORDAN');
  });

  it("treats SAM (CONT'D) as the same character SAM", () => {
    const sams = result.characters.filter(c =>
      c.name.toUpperCase().replace(/\s*\(.*\)\s*/, '') === 'SAM'
    );
    expect(sams).toHaveLength(1);
  });

  it('classifies dialogue lines following a character cue', () => {
    const dialogue = result.lines.find(l => l.text === "You're late again.");
    expect(dialogue).toBeDefined();
    expect(dialogue!.type).toBe('dialogue');
  });

  it('classifies parentheticals', () => {
    const paren = result.lines.find(l => l.text === '(without looking up)');
    expect(paren).toBeDefined();
    expect(paren!.type).toBe('parenthetical');
  });

  it('classifies transitions', () => {
    const cut = result.lines.find(l => l.text === 'CUT TO:');
    expect(cut).toBeDefined();
    expect(cut!.type).toBe('transition');
  });

  it('every line has a valid confidence score', () => {
    for (const line of result.lines) {
      expect(line.confidence).toBeGreaterThanOrEqual(0);
      expect(line.confidence).toBeLessThanOrEqual(100);
    }
  });

  it('scene indexes are ordered and non-overlapping', () => {
    for (let i = 1; i < result.scenes.length; i++) {
      expect(result.scenes[i].startIndex).toBeGreaterThan(result.scenes[i - 1].startIndex);
    }
  });
});

describe('parseScript edge cases', () => {
  it('handles empty input without throwing', () => {
    const r = parseScript('');
    expect(r.scenes).toHaveLength(0);
    expect(r.characters).toHaveLength(0);
  });

  it('handles whitespace-only input', () => {
    const r = parseScript('   \n\n   \n');
    expect(r.scenes).toHaveLength(0);
  });

  it('handles plain prose with no screenplay structure', () => {
    const r = parseScript('Just a note to self.\nBuy milk.\nCall mom.');
    expect(r.scenes).toHaveLength(0);
    expect(r.lines.length).toBeGreaterThan(0);
  });

  it('does not treat shouted action words as character cues', () => {
    const r = parseScript('INT. ROOM - DAY\n\nBOOM! The wall explodes.\n');
    const names = r.characters.map(c => c.name.toUpperCase());
    expect(names).not.toContain('BOOM!');
  });

  it('recognizes INT./EXT. combined slugs', () => {
    const r = parseScript('INT./EXT. CAR - DAY\n\nDriving.\n');
    expect(r.scenes).toHaveLength(1);
  });

  it('accepts learned character names', () => {
    const r = parseScript('INT. LAB - DAY\n\nX9\nHello, human.\n', 'screenplay', new Set(['X9']));
    const names = r.characters.map(c => c.name.toUpperCase());
    expect(names).toContain('X9');
  });
});
