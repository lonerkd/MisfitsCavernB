import { describe, it, expect } from 'vitest';
import { preClean, looksLikeScreenplay } from './normalize';

describe('preClean', () => {
  it('normalizes curly quotes and em/en dashes to plain ASCII', () => {
    const out = preClean(`He said “hello” — then left. It's a test’s worth.`);
    expect(out).not.toMatch(/[“”‘’]/);
    expect(out).toContain('--');
  });

  it('normalizes CRLF and stray unicode ellipsis to three dots', () => {
    const out = preClean('Line one\r\nWait…\r\n');
    expect(out).not.toContain('\r');
    expect(out).toContain('...');
  });

  it('strips standalone page-number lines', () => {
    const out = preClean('INT. ROOM - DAY\n\n12.\n\nAction happens.');
    expect(out).not.toMatch(/^\s*12\.?\s*$/m);
  });

  it('strips CONTINUED / MORE / CONT\'D marker lines', () => {
    const out = preClean('Some action.\n\nCONTINUED:\n\nMore action.\n\n(MORE)');
    expect(out).not.toMatch(/^CONTINUED:?$/mi);
    expect(out).not.toMatch(/^\(MORE\)$/mi);
  });

  it('collapses multiple consecutive blank lines into one', () => {
    const out = preClean('Line one\n\n\n\n\nLine two');
    expect(out).not.toMatch(/\n{3,}/);
  });

  it('trims trailing whitespace from every line', () => {
    const out = preClean('Line one   \nLine two\t\t\n');
    for (const line of out.split('\n')) {
      expect(line).toBe(line.trimEnd());
    }
  });

  it('is idempotent — running it twice produces the same result', () => {
    const raw = `INT. ROOM - DAY\n\nSAM speaks.\n\n12.\n\nCONTINUED:\n\nMore.`;
    const once = preClean(raw);
    const twice = preClean(once);
    expect(twice).toBe(once);
  });
});

describe('looksLikeScreenplay', () => {
  it('recognizes text with scene headings and dialogue cues as a screenplay', () => {
    const text = 'INT. COFFEE SHOP - DAY\n\nSAM\nHello there.\n\nEXT. STREET - NIGHT\n\nJORDAN\nGoodbye.';
    expect(looksLikeScreenplay(text)).toBe(true);
  });

  it('does not classify plain prose as a screenplay', () => {
    const text = 'This is just a regular paragraph of prose with no screenplay structure at all, written the way a novel would be.';
    expect(looksLikeScreenplay(text)).toBe(false);
  });

  it('handles empty input without throwing', () => {
    expect(looksLikeScreenplay('')).toBe(false);
  });
});
