import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The tool header leads every tool page; sub-navs and everything else sit below it
// (owner, Nov 27, 2026, over the Library tab's chips rendering above its header card).
// These pins hold the order on the surfaces that were audited: Library and Production
// were the offenders; Post already complied and is pinned so it stays that way.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const library = read('components/studio/tabs/LibraryTab.tsx');
const production = read('components/studio/tabs/ProductionTab.tsx');
const post = read('components/studio/tabs/PostTab.tsx');

describe('the tool header leads its page', () => {
  it('Library: the view switch renders under the References & Media header', () => {
    expect(library.indexOf('{viewChips}', library.indexOf('title="References & Media"')))
      .toBeGreaterThan(library.indexOf('title="References & Media"'));
  });

  it('Library: Mood boards gets the same anatomy — header, switch, then the boards', () => {
    expect(library.indexOf('title="Mood boards"')).toBeLessThan(library.indexOf('<BoardsPanel />'));
    expect(library.indexOf('title="Mood boards"')).toBeLessThan(library.indexOf('{viewChips}'));
  });

  it('Production: the open tool’s intro renders above the tool browser', () => {
    expect(production.indexOf('<ToolIntro')).toBeGreaterThan(-1);
    expect(production.indexOf('<ToolIntro')).toBeLessThan(production.indexOf('Find a production tool'));
  });

  it('Post: the header still leads its view chips', () => {
    expect(post.indexOf('<TabHeader')).toBeLessThan(post.indexOf('Post views'));
  });
});
