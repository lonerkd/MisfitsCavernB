import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The project page was the one suite page that did not reserve the island's room: a fixed 120px
// guess on desktop, and on phones a 40px bottom padding — less than the island's resting footprint
// (70px at size 1, more as the owner scales it up) — so the foot of the hub sat permanently under
// the pill (owner, Nov 26, 2026: keep the pill this big, hide the overlap). These pins keep the
// page on the island's own published measure, like every sibling page.
const globals = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
const page = readFileSync(join(process.cwd(), 'app', '(suite)', 'projects', '[id]', 'page.tsx'), 'utf8');

describe('the project page leaves room for the island', () => {
  it('the phone rule reserves the island height plus air', () => {
    expect(globals).toContain('.mc-project-body { padding: 18px 16px calc(var(--taskbar-height, 70px) + 32px) !important; }');
  });

  it('the page padding takes the published measure, not a fixed guess', () => {
    expect(page).toContain("padding: '28px 28px calc(var(--taskbar-height, 70px) + 44px)'");
    expect(page).not.toContain("padding: '28px 28px 120px'");
  });
});
