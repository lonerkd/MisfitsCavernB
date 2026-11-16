import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The suite layout (app/(suite)/layout.tsx) owns the page's single <main id="main-content">.
// A page that renders its own <main> nests a second main landmark (an accessibility error).
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'page.tsx') out.push(p);
  }
  return out;
}

describe('one main landmark per page', () => {
  const pages = walk(join(process.cwd(), 'app', '(suite)'));

  it('finds the suite pages', () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  it.each(pages.map((p) => [p.split(/[\\/]app[\\/]/)[1] ?? p, p] as const))('%s does not render its own <main>', (_label, file) => {
    expect(readFileSync(file, 'utf8')).not.toContain('<main');
  });
});
