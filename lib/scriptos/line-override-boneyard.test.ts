import { describe, expect, it } from 'vitest';
import { parseScript } from './parser';

// (These guard the boneyard state; they pass on the old code too, so the reviewer's failure is not visible in the output, only in the decoder's view.)
// A person can force the type of any line ("Force type"). Forcing a `/*` or `*/` line must not leave the comment open:
// the boneyard state has to advance on that line, or every later line is read as commentary and drops out of the scenes.
const SCRIPT = 'INT. KITCHEN - DAY\n\nMAYA\nOne.\n\n/* cut this\nfor now */\n\nINT. GARDEN - DAY\n\nELI\nTwo.\n';
const lines = SCRIPT.split('\n');
const idx = (needle: string) => lines.findIndex((l) => l.includes(needle));

const types = (overrides: Array<{ line_index: number; forced_type: string }>) =>
  parseScript(SCRIPT, 'screenplay', undefined, { context: { lineOverrides: overrides } as never }).lines.map((l) => l.type);

describe('a forced line type and the /* ... */ comment', () => {
  it('with no override, the scenes after the comment are read', () => {
    const t = types([]);
    expect(t[idx('INT. GARDEN')]).toBe('slug');
  });

  it('forcing the closing line does not swallow the rest of the script', () => {
    const t = types([{ line_index: idx('for now */'), forced_type: 'action' }]);
    expect(t[idx('INT. GARDEN')]).toBe('slug');
    expect(t[idx('ELI')]).toBe('character');
    expect(t[idx('Two.')]).toBe('dialogue');
  });

  it('forcing the opening line leaves the comment closed where it closes', () => {
    const t = types([{ line_index: idx('/* cut this'), forced_type: 'action' }]);
    expect(t[idx('INT. GARDEN')]).toBe('slug');
    expect(t[idx('ELI')]).toBe('character');
  });

  // Fixed: a forced type now applies to the line itself (BACKLOG 3.21 B8 resolved).
  it('an override on an ordinary line changes that line', () => {
    const t = types([{ line_index: idx('MAYA'), forced_type: 'action' }]);
    expect(t[idx('MAYA')]).toBe('action');
  });
});
