import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The owner's first phone trial of the island (Nov 26, 2026): in the editor the collapsed compact island
// wrapped — title on one row, Capture alone and centred on a second. Collapsed, the compact island is
// one row; these pins keep the wrap from coming back. (The open deck is exempt: stacking is its shape.)
const css = readFileSync(join(process.cwd(), 'components', 'island', 'island.module.css'), 'utf8');

describe('the collapsed compact island is one row', () => {
  it('the face never wraps while the deck is closed', () => {
    expect(css).toMatch(/\.dock\[data-compact='true'\]:not\(\[data-island='open'\]\) \.main \{ flex-wrap: nowrap; \}/);
  });

  it('the inline controls never wrap while the deck is closed', () => {
    expect(css).toMatch(/\.dock\[data-compact='true'\]:not\(\[data-island='open'\]\) \.inline \{ flex-wrap: nowrap; overflow: hidden; \}/);
  });
});
