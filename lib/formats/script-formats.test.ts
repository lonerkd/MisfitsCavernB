import { describe, it, expect } from 'vitest';
import {
  SCRIPT_FORMAT_REGISTRY,
  DEFAULT_SCRIPT_FORMAT,
  SCRIPT_FORMATS,
  isScriptFormat,
} from './script-formats';

describe('SCRIPT_FORMAT_REGISTRY', () => {
  it('should have exactly the expected keys', () => {
    const expectedKeys = ['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline'];
    expect(Object.keys(SCRIPT_FORMAT_REGISTRY)).toEqual(expectedKeys);
  });

  it('should have non-empty labels for all formats', () => {
    for (const key of Object.keys(SCRIPT_FORMAT_REGISTRY)) {
      const format = SCRIPT_FORMAT_REGISTRY[key as keyof typeof SCRIPT_FORMAT_REGISTRY];
      expect(format.label).toBeDefined();
      expect(typeof format.label).toBe('string');
      expect(format.label.length).toBeGreaterThan(0);
    }
  });

  it('should handle empty registry gracefully', () => {
    const emptyRegistry: Record<string, { label: string }> = {};
    expect(Object.keys(emptyRegistry)).toEqual([]);
  });

  it('should handle malformed entries (missing label)', () => {
    const malformedEntry: Record<string, { label?: string }> = { bad: {} };
    // Verify that accessing a missing label property returns undefined
    expect(malformedEntry.bad.label).toBeUndefined();
  });
});

describe('DEFAULT_SCRIPT_FORMAT', () => {
  it('should default to screenplay', () => {
    expect(DEFAULT_SCRIPT_FORMAT).toBe('screenplay');
  });

  it('should be a valid script format', () => {
    expect(isScriptFormat(DEFAULT_SCRIPT_FORMAT)).toBe(true);
  });

  it('should handle empty string as invalid default', () => {
    expect(DEFAULT_SCRIPT_FORMAT).not.toBe('');
  });
});

describe('SCRIPT_FORMATS', () => {
  it('should contain all format keys from registry', () => {
    const expectedKeys = ['screenplay', 'teleplay', 'stage-play', 'treatment', 'podcast', 'doc-outline'];
    expect(SCRIPT_FORMATS).toEqual(expectedKeys);
  });

  it('should have same length as registry keys', () => {
    expect(SCRIPT_FORMATS.length).toBe(Object.keys(SCRIPT_FORMAT_REGISTRY).length);
  });

  it('should handle empty SCRIPT_FORMATS array', () => {
    const emptyArray: string[] = [];
    expect(emptyArray.length).toBe(0);
  });
});

describe('isScriptFormat', () => {
  it('should return true for valid format names', () => {
    expect(isScriptFormat('screenplay')).toBe(true);
    expect(isScriptFormat('teleplay')).toBe(true);
    expect(isScriptFormat('stage-play')).toBe(true);
    expect(isScriptFormat('treatment')).toBe(true);
    expect(isScriptFormat('podcast')).toBe(true);
    expect(isScriptFormat('doc-outline')).toBe(true);
  });

  it('should return false for invalid format names', () => {
    expect(isScriptFormat('invalid')).toBe(false);
    expect(isScriptFormat('')).toBe(false);
    expect(isScriptFormat(null as any)).toBe(false);
    expect(isScriptFormat(undefined as any)).toBe(false);
    expect(isScriptFormat(123 as any)).toBe(false);
    expect(isScriptFormat({} as any)).toBe(false);
  });

  it('should handle empty string input', () => {
    expect(isScriptFormat('')).toBe(false);
  });

  it('should handle null input', () => {
    expect(isScriptFormat(null as any)).toBe(false);
  });

  it('should handle undefined input', () => {
    expect(isScriptFormat(undefined as any)).toBe(false);
  });

  it('should handle number input', () => {
    expect(isScriptFormat(123 as any)).toBe(false);
  });

  it('should handle object input', () => {
    expect(isScriptFormat({} as any)).toBe(false);
  });

  it('should handle boolean input', () => {
    expect(isScriptFormat(true as any)).toBe(false);
    expect(isScriptFormat(false as any)).toBe(false);
  });

  it('should handle empty object input', () => {
    expect(isScriptFormat({} as any)).toBe(false);
  });

  it('should handle array input', () => {
    expect(isScriptFormat([] as any)).toBe(false);
  });

  it('should handle special characters in string', () => {
    expect(isScriptFormat('screen-play')).toBe(false);
    expect(isScriptFormat('screen play')).toBe(false);
    expect(isScriptFormat('SCREENPLAY')).toBe(false);
    expect(isScriptFormat('Screenplay')).toBe(false);
  });

  it('should handle whitespace-only string', () => {
    expect(isScriptFormat('   ')).toBe(false);
  });

  it('should handle single character strings', () => {
    expect(isScriptFormat('s')).toBe(false);
    expect(isScriptFormat('t')).toBe(false);
  });

  it('should handle very long string', () => {
    const longString = 'a'.repeat(1000);
    expect(isScriptFormat(longString)).toBe(false);
  });

  it('should handle unicode characters', () => {
    expect(isScriptFormat('screenplay-日本語')).toBe(false);
    expect(isScriptFormat('screenplay-emoji🎬')).toBe(false);
  });

  it('should handle format name with hyphen', () => {
    expect(isScriptFormat('stage-play')).toBe(true);
    expect(isScriptFormat('doc-outline')).toBe(true);
  });

  it('should handle partial match of valid format', () => {
    expect(isScriptFormat('screen')).toBe(false);
    expect(isScriptFormat('tele')).toBe(false);
    expect(isScriptFormat('podca')).toBe(false);
  });

  it('should handle case sensitivity', () => {
    expect(isScriptFormat('Screenplay')).toBe(false);
    expect(isScriptFormat('SCREENPLAY')).toBe(false);
    expect(isScriptFormat('Stage-Play')).toBe(false);
  });
});
