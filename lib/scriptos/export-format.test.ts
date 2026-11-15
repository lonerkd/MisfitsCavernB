import { describe, it, expect } from 'vitest';
import { reemitsAsFountain } from './export';

describe('reemitsAsFountain', () => {
  it('only screenplay-read formats go through the Fountain emitter', () => {
    expect(reemitsAsFountain('screenplay')).toBe(true);
    expect(reemitsAsFountain(undefined)).toBe(true);
    expect(reemitsAsFountain('teleplay')).toBe(true);
    for (const f of ['podcast', 'copy', 'doc-outline', 'video-script', 'prose', 'game-script']) expect(reemitsAsFountain(f)).toBe(false);
  });
});

import { exportChoicesFor } from './export';
describe('exportChoicesFor', () => {
  it('offers Final Draft only to screenplay-read formats', () => {
    expect(exportChoicesFor('screenplay')).toContain('fdx');
    expect(exportChoicesFor(undefined)).toContain('fdx');
    expect(exportChoicesFor('podcast')).not.toContain('fdx');
    expect(exportChoicesFor('copy')).toEqual(['pdf', 'txt', 'fountain']);
  });
});
