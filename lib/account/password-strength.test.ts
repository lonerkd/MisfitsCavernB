import { describe, expect, it } from 'vitest';
import { checkPasswordComplexity } from './password-strength';

describe('checkPasswordComplexity', () => {
  it('accepts a password meeting every rule', () => {
    expect(checkPasswordComplexity('Cavern2026x')).toBeNull();
  });
  it('rejects short passwords first', () => {
    expect(checkPasswordComplexity('Ab1')).toMatch(/at least 8/);
  });
  it('names the missing class', () => {
    expect(checkPasswordComplexity('ABCDEFG1')).toMatch(/lowercase/);
    expect(checkPasswordComplexity('abcdefg1')).toMatch(/uppercase/);
    expect(checkPasswordComplexity('Abcdefgh')).toMatch(/number/);
  });
  it('counts non-Latin letters', () => {
    expect(checkPasswordComplexity('Éclair123')).toBeNull();
  });
});
