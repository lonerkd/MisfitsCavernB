import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PARAMS } from './decode';
import { buildReference, PARAM_DOCS } from './reference';

const FILE = join(process.cwd(), '.cavern-intelligence', 'parser-reference.md');
// `npm run parser:reference` sets this to write the file. It is ignored in CI, so a stale file is always caught there.
const writing = process.env.UPDATE_PARSER_REFERENCE === '1' && !process.env.CI;

describe('the parser reference', () => {
  it('describes every decoder weight, and nothing that is not one', () => {
    expect(Object.keys(PARAM_DOCS).sort()).toEqual(Object.keys(DEFAULT_PARAMS).sort());
    for (const text of Object.values(PARAM_DOCS)) expect(text.length).toBeGreaterThan(5);
  });

  // Read-only: a normal test run never writes the file. (Line endings are normalised: a Windows checkout may have CRLF.)
  it.skipIf(writing)('is the committed file (run `npm run parser:reference` after changing a word list or a weight)', () => {
    expect(existsSync(FILE), 'run `npm run parser:reference` to create it').toBe(true);
    expect(readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')).toBe(buildReference());
  });

  it.skipIf(!writing)('writes the committed file', () => {
    writeFileSync(FILE, buildReference());
  });
});
