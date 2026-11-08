import { describe, it, expect } from 'vitest';
import { laurelLine, parseYear } from './laurels';

describe('laurels', () => {
  it('says the kind, the name and the year', () => {
    expect(laurelLine({ name: 'Rotterdam', kind: 'award', year: 2026 })).toBe('Award · Rotterdam · 2026');
    expect(laurelLine({ name: 'Local Night', kind: 'screening' })).toBe('Screening · Local Night');
    expect(laurelLine({ name: 'X', kind: 'mystery' })).toBe('Laurel · X');
  });
  it('reads a typed year, or nothing', () => {
    expect(parseYear(' 2026 ')).toBe(2026);
    expect(parseYear('')).toBeNull();
    expect(parseYear('abc')).toBeNull();
    expect(parseYear('1700')).toBeNull();
    expect(parseYear('3000')).toBeNull();
  });
});
