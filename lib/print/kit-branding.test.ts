import { describe, expect, it } from 'vitest';
import { printHtml, type PrintDoc } from './kit';

const plain: PrintDoc = {
  title: 'Call sheet', kind: 'Call sheet', subtitle: 'The Pier', footer: 'The Pier', generated: '8 Nov 2026',
  meta: [['Date', '12 March']],
  blocks: [{ type: 'table', columns: [{ key: 'a', label: 'A' }], rows: [{ a: '1' }], totals: { a: '1' } }],
};

describe('print kit branding', () => {
  it('output with no accent and no logo is unchanged', () => {
    expect(printHtml(plain)).toMatchSnapshot();
  });
  it('a project accent also colours the table rules', () => {
    const html = printHtml({ ...plain, accent: '#12ab9f' });
    expect(html).toContain('--accent:#12ab9f');
    expect(html).toContain('--rulehead:#12ab9f');
  });
  it('an invalid accent changes nothing', () => {
    expect(printHtml({ ...plain, accent: 'red;}' })).toBe(printHtml(plain));
  });
  it('shows an https logo small, top-left, beside the title', () => {
    const html = printHtml({ ...plain, logo: 'https://cdn.test/logo.png' });
    expect(html).toContain('<img class="logo" src="https://cdn.test/logo.png" alt="">');
    expect(html.indexOf('class="logo"')).toBeLessThan(html.indexOf('<h1>'));
  });
  it('refuses a logo that is not https', () => {
    for (const bad of ['http://x.test/a.png', 'javascript:alert(1)', 'https://x.test/a"onerror="x', '', null]) {
      expect(printHtml({ ...plain, logo: bad as string | null })).toBe(printHtml(plain));
    }
  });
});
