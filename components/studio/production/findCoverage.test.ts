import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// A record tool that keeps a list registers its search box in the header through useSettingsList; if it then drew `items` and
// not `shown`, the box would do nothing. Every tool that registers must draw the narrowed list.
const dir = __dirname;
const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));

describe('every searchable record tool draws the narrowed list', () => {
  for (const f of files) {
    const src = readFileSync(path.join(dir, f), 'utf8');
    const calls = src.match(/useSettingsList\([^)]*\)/g) ?? [];
    const registers = calls.some((c) => !/find:\s*false/.test(c));
    if (!registers) continue;
    it(`${f} draws shown`, () => {
      expect(src).toMatch(/\bshown\b/);
    });
  }
  it('finds the tools to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });
});
