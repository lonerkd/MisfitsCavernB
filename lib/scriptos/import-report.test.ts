import { describe, expect, it } from 'vitest';
import { importDoubts, importMessage } from './import-report';

const clean = ['INT. KITCHEN - DAY', '', 'Maya pours coffee.', '', 'MAYA', 'Morning.', '', 'SAM', 'Morning.', '', 'MAYA', 'Coffee?', '', 'SAM', 'Please.', ''].join('\n');

describe('importMessage', () => {
  it('says only the title when nothing is in doubt', () => {
    expect(importMessage('Pilot', 0)).toBe('Imported "Pilot"');
  });
  it('says how many things and where to look', () => {
    expect(importMessage('Pilot', 1)).toContain('1 thing:');
    expect(importMessage('Pilot', 4)).toContain('4 things');
    expect(importMessage('Pilot', 4)).toContain('Doubtful reads');
  });
});

describe('importDoubts', () => {
  it('a plainly written script has none', () => {
    expect(importDoubts(clean)).toBe(0);
  });
  it('an empty or odd text never throws', () => {
    expect(importDoubts('')).toBe(0);
    expect(importDoubts('\u0000\u0001 ???')).toBeGreaterThanOrEqual(0);
  });
  it('counts what the reader review would show', () => {
    // A name that speaks only once, in a script with no blank lines, is the classic doubt.
    const doubtful = ['INT. LAB - NIGHT', 'Rain on the glass.', 'IRIS', 'We are late.', 'HUSH', 'Somebody is outside.', 'SAM', 'Stay here.'].join('\n');
    expect(importDoubts(doubtful)).toBeGreaterThan(0);
  });
});
