// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { lockScroll } from './scrollLock';

describe('lockScroll', () => {
  beforeEach(() => { document.body.style.overflow = ''; });

  it('locks while open and restores on release', () => {
    const off = lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    off();
    expect(document.body.style.overflow).toBe('');
  });

  it('overlapping holders never leave the page stuck, whatever order they close in', () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    expect(document.body.style.overflow).toBe('hidden');
    b();
    expect(document.body.style.overflow).toBe('');
  });

  it('releasing twice does not unlock someone else', () => {
    const a = lockScroll();
    const b = lockScroll();
    a(); a();
    expect(document.body.style.overflow).toBe('hidden');
    b();
    expect(document.body.style.overflow).toBe('');
  });
});
