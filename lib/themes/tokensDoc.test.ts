import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// design-tokens.md quotes the default theme's values. They must be the ones in globals.css.
const root = join(__dirname, '..', '..');
const css = readFileSync(join(root, 'app', 'globals.css'), 'utf8');
const doc = readFileSync(join(root, '.cavern-intelligence', 'design-tokens.md'), 'utf8');
const block = css.match(/\[data-theme="default"\]\s*\{([^}]*)\}/)![1];
const cssValue = (name: string) => block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim().toLowerCase();

describe('design-tokens.md matches the default theme', () => {
  it.each(['--bg', '--bg-2', '--bg-3', '--bg-4', '--fg', '--accent', '--secondary'])('%s', (name) => {
    const row = doc.match(new RegExp(`\\|\\s*\`${name}\`\\s*\\|\\s*\`(#[0-9a-fA-F]{6})\``));
    expect(row, `${name} has a row in design-tokens.md`).not.toBeNull();
    expect(row![1].toLowerCase()).toBe(cssValue(name));
  });

  it('opacities of the text and border tokens', () => {
    const alpha = (name: string) => Number(cssValue(name)?.match(/,\s*([\d.]+)\)$/)?.[1]);
    for (const name of ['--fg-muted', '--fg-dim', '--fg-ghost', '--border', '--border-2']) {
      const row = doc.match(new RegExp(`\\|\\s*\`${name}\`\\s*\\|[^|]*\\|\\s*([\\d.]+)`));
      expect(Number(row?.[1]), name).toBe(alpha(name));
    }
  });
});
