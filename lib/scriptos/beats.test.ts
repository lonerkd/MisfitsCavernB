import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ supabase: {} }));

import { beatAsFountain } from './beats';
import { parseScript } from './parser';

describe('beatAsFountain', () => {
  it('is a section (the title) with synopsis lines (what happens), after a blank line', () => {
    expect(beatAsFountain({ title: 'The match goes out', content: 'Ana loses the light.\n\n  She hears the boat.  ' }))
      .toBe('\n\n# The match goes out\n= Ana loses the light.\n= She hears the boat.\n');
  });

  it('a beat without words is just its section; without a title it still has one', () => {
    expect(beatAsFountain({ title: 'Midpoint', content: null })).toBe('\n\n# Midpoint\n');
    expect(beatAsFountain({ title: '  ', content: 'Something turns.' })).toBe('\n\n# Untitled beat\n= Something turns.\n');
  });

  it('a title on several lines stays one section line', () => {
    expect(beatAsFountain({ title: 'Act two\nbegins', content: '' })).toBe('\n\n# Act two begins\n');
  });

  it('reads back as notes, not as script: a section and synopses (they don’t print)', () => {
    const script = 'INT. HARBOUR - NIGHT\n\nWaves.' + beatAsFountain({ title: 'The match goes out', content: 'Ana loses the light.' });
    const types = parseScript(script).lines.filter((l) => l.text.trim()).map((l) => l.type);
    expect(types.slice(-2)).toEqual(['section', 'synopsis']);
  });
});
