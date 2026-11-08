import { describe, expect, it } from 'vitest';
import { PAGE_LABEL, PAGE_NOTE, PAGE_SETTINGS, pageIsIndexable, pagePath, pageSettingOf } from './page-setting';

describe('a person’s portfolio page setting', () => {
  it('has three settings, each with its words', () => {
    expect(PAGE_SETTINGS).toEqual(['off', 'unlisted', 'public']);
    for (const s of PAGE_SETTINGS) { expect(PAGE_LABEL[s]).toBeTruthy(); expect(PAGE_NOTE[s]).toBeTruthy(); }
  });

  it('trusts nothing that came back: anything unknown is off', () => {
    expect(pageSettingOf('public')).toBe('public');
    expect(pageSettingOf('unlisted')).toBe('unlisted');
    expect(pageSettingOf('everyone')).toBe('off');
    expect(pageSettingOf(null)).toBe('off');
    expect(pageSettingOf(undefined)).toBe('off');
  });

  it('the address is the encoded username', () => {
    expect(pagePath('maya')).toBe('/u/maya');
    expect(pagePath(' Maya Ruiz ')).toBe('/u/Maya%20Ruiz');
    expect(pagePath('a/b?c')).toBe('/u/a%2Fb%3Fc');
  });

  it('only a public page may be indexed', () => {
    expect(pageIsIndexable('public')).toBe(true);
    expect(pageIsIndexable('unlisted')).toBe(false);
    expect(pageIsIndexable('off')).toBe(false);
  });
});
