// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isTypable, scrollParent, scrollToReveal } from './PhoneKeyboard';

describe('scrollToReveal', () => {
  const visible = { top: 0, height: 516 }; // iPhone 15 Pro portrait with the keyboard up
  it('does nothing for a field comfortably in view', () => {
    expect(scrollToReveal({ top: 100, bottom: 150 }, visible)).toBe(0);
  });
  it('brings a field under the keyboard to the middle of what is visible', () => {
    expect(scrollToReveal({ top: 600, bottom: 650 }, visible)).toBe(625 - 258);
  });
  it('brings a field above the top edge down to the middle', () => {
    expect(scrollToReveal({ top: -40, bottom: 10 }, visible)).toBe(-15 - 258);
  });
  it('a field too close to the keyboard counts as hidden (a margin)', () => {
    expect(scrollToReveal({ top: 470, bottom: 512 }, visible)).not.toBe(0);
  });
  it('respects the visual viewport offset iOS scrolls by', () => {
    expect(scrollToReveal({ top: 250, bottom: 300 }, { top: 200, height: 300 })).toBe(0);
  });
});

describe('isTypable', () => {
  it('text-like fields yes; buttons, checkboxes and files no', () => {
    const mk = (tag: string, type?: string) => { const e = document.createElement(tag); if (type) (e as HTMLInputElement).type = type; return e; };
    expect(isTypable(mk('input', 'text'))).toBe(true);
    expect(isTypable(mk('input', 'email'))).toBe(true);
    expect(isTypable(mk('textarea'))).toBe(true);
    expect(isTypable(mk('select'))).toBe(true);
    expect(isTypable(mk('input', 'checkbox'))).toBe(false);
    expect(isTypable(mk('input', 'submit'))).toBe(false);
    expect(isTypable(mk('input', 'file'))).toBe(false);
    expect(isTypable(mk('button'))).toBe(false);
    expect(isTypable(null)).toBe(false);
  });
});

describe('scrollParent', () => {
  it('finds the nearest vertically scrolling ancestor, or null for the page', () => {
    const outer = document.createElement('div'); const inner = document.createElement('div'); const input = document.createElement('input');
    document.body.append(outer); outer.append(inner); inner.append(input);
    expect(scrollParent(input)).toBeNull();
    inner.style.overflowY = 'auto';
    Object.defineProperty(inner, 'scrollHeight', { value: 500 }); Object.defineProperty(inner, 'clientHeight', { value: 200 });
    expect(scrollParent(input)).toBe(inner);
    outer.remove();
  });
  it('ignores a container that does not actually overflow', () => {
    const box = document.createElement('div'); const input = document.createElement('input');
    box.style.overflowY = 'auto'; document.body.append(box); box.append(input);
    expect(scrollParent(input)).toBeNull();
    box.remove();
  });
});
