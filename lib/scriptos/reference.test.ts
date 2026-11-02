import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PARAMS } from './decode';
import { buildReference, PARAM_DOCS } from './reference';

const FILE = join(process.cwd(), '.cavern-intelligence', 'parser-reference.md');

describe('the parser reference', () => {
  it('describes every decoder weight, and nothing that is not one', () => {
    expect(Object.keys(PARAM_DOCS).sort()).toEqual(Object.keys(DEFAULT_PARAMS).sort());
    for (const text of Object.values(PARAM_DOCS)) expect(text.length).toBeGreaterThan(5);
  });

  it('is the committed file (run `npm run parser:reference` after changing a word list or a weight)', () => {
    const fresh = buildReference();
    if (process.env.UPDATE_PARSER_REFERENCE === '1') writeFileSync(FILE, fresh);
    expect(existsSync(FILE), 'run `npm run parser:reference` to create it').toBe(true);
    expect(readFileSync(FILE, 'utf8')).toBe(fresh);
  });
});
