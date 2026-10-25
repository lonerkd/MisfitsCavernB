import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseInline, safeHref, plainText } from './markdown';

describe('parseMarkdown', () => {
  it('reads headings, paragraphs, lists and quotes', () => {
    const blocks = parseMarkdown('# Title\n\nFirst line\nsame paragraph\n\n- one\n- two\n\n1. a\n2. b\n\n> said');
    expect(blocks.map((b) => b.t)).toEqual(['h', 'p', 'ul', 'ol', 'quote']);
    expect(blocks[1]).toEqual({ t: 'p', v: [{ t: 'text', v: 'First line same paragraph' }] });
    expect(blocks[2]).toMatchObject({ t: 'ul', items: [[{ t: 'text', v: 'one' }], [{ t: 'text', v: 'two' }]] });
  });

  it('keeps heading levels to three', () => {
    expect(parseMarkdown('### Small')[0]).toMatchObject({ t: 'h', level: 3 });
    expect(parseMarkdown('#### Too deep')[0].t).toBe('p');
  });
});

describe('parseInline', () => {
  it('reads bold, italic, code and links', () => {
    expect(parseInline('**b** _i_ `c` [l](https://x.test)')).toEqual([
      { t: 'strong', v: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' ' },
      { t: 'em', v: [{ t: 'text', v: 'i' }] }, { t: 'text', v: ' ' },
      { t: 'code', v: 'c' }, { t: 'text', v: ' ' },
      { t: 'link', href: 'https://x.test', v: [{ t: 'text', v: 'l' }] },
    ]);
  });

  it('never makes a javascript: link — it stays text', () => {
    expect(parseInline('[x](javascript:alert(1))').some((n) => n.t === 'link')).toBe(false);
  });

  it('leaves HTML as text', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ t: 'text', v: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('safeHref', () => {
  it('allows http(s) and in-app paths only', () => {
    expect(safeHref('https://a.b/c')).toBe('https://a.b/c');
    expect(safeHref('/lounge')).toBe('/lounge');
    expect(safeHref('//evil.test')).toBeNull();
    expect(safeHref('data:text/html,hi')).toBeNull();
  });
});

describe('plainText', () => {
  it('flattens and shortens', () => {
    expect(plainText('# Hi\n\n**Bold** words', 100)).toBe('Hi Bold words');
    expect(plainText('word '.repeat(100), 20)).toHaveLength(20);
  });
});
