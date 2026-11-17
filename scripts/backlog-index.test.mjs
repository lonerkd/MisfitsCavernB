import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildIndex, firstSentence } from './backlog-index.mjs';

const detail = `# T\n\n---\n\n## 1. For the owner\n\n- Do a thing.\n\n## 3. Upgrades\n\n### 3.9 Big item — L (owner)\nThis is the first sentence of the item and it is long enough. Second sentence stays out.\n\n### 3.10 Other — S\nOnly one sentence here and nothing more to say about it\n\n## 4. Wishlist\n\n### 4.1 Idea\nAn idea that is described in a sentence long enough to count. More.\n`;

describe('backlog index', () => {
  it('keeps the owner section whole and one sentence per item, in order', () => {
    const out = buildIndex(detail);
    expect(out).toContain('- Do a thing.');
    expect(out).toContain('### 3.9 Big item — L (owner)');
    expect(out).toContain('first sentence of the item and it is long enough.');
    expect(out).not.toContain('Second sentence');
    expect(out.indexOf('3.9 Big')).toBeLessThan(out.indexOf('4.1 Idea'));
    expect(out).toContain('(full text: `backlog-detail.md`, 4.1)');
  });
  it('caps a sentence that never ends', () => {
    expect(firstSentence('word '.repeat(200)).length).toBeLessThanOrEqual(262);
  });
  it('the committed BACKLOG.md is the index of the committed detail file', () => {
    const d = readFileSync(new URL('../.cavern-intelligence/backlog-detail.md', import.meta.url), 'utf8');
    const i = readFileSync(new URL('../.cavern-intelligence/BACKLOG.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    expect(i).toBe(buildIndex(d));
    expect(i.length).toBeLessThan(d.length / 3);
  });
});
