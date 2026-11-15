import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_LINKS } from './links';

// Every admin screen is reachable: the admin home page links to each one (a screen added without a link is hidden, which is how the
// admin area stayed hard to find), and the island offers the most used ones (its deck has eight keys).
describe('admin links', () => {
  const root = join(process.cwd(), 'app', '(suite)', 'admin');
  const screens = readdirSync(root).filter((n) => statSync(join(root, n)).isDirectory() && readdirSync(join(root, n)).includes('page.tsx')).map((n) => `/admin/${n}`);

  it('the admin home page links to every admin screen', () => {
    const home = readFileSync(join(root, 'page.tsx'), 'utf8');
    for (const path of screens) expect(home, path).toContain(`href="${path}"`);
  });
  it('the island offers only real screens, no more than it has keys for, each once', () => {
    expect(ADMIN_LINKS.length).toBeLessThanOrEqual(8);
    for (const l of ADMIN_LINKS) expect(screens, l.href).toContain(l.href);
    expect(new Set(ADMIN_LINKS.map((l) => l.id)).size).toBe(ADMIN_LINKS.length);
  });
});
