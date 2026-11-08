import { describe, expect, it } from 'vitest';
import { phoneState } from './usePhone';

describe('phoneState', () => {
  it('portrait iPhone 15 Pro, no keyboard', () => {
    expect(phoneState({ width: 393, height: 852 }, { height: 852, offsetTop: 0 }, true)).toEqual({ phone: true, landscape: false, keyboard: 0, typing: false, height: 852, offset: 0 });
  });
  it('the keyboard covers the bottom: typing, and the visible height is what is left', () => {
    const s = phoneState({ width: 393, height: 852 }, { height: 516, offsetTop: 0 }, true);
    expect(s).toMatchObject({ keyboard: 336, typing: true, height: 516 });
  });
  it('iOS scrolls the visual viewport when the keyboard opens: that offset is not keyboard', () => {
    expect(phoneState({ width: 393, height: 852 }, { height: 516, offsetTop: 200 }, true).keyboard).toBe(136);
  });
  it('offset is how far iOS scrolled the visible part', () => {
    expect(phoneState({ width: 393, height: 852 }, { height: 516, offsetTop: 90 }, true).offset).toBe(90);
  });
  it('landscape is wider than tall', () => {
    expect(phoneState({ width: 852, height: 393 }, { height: 393, offsetTop: 0 }, true)).toMatchObject({ landscape: true, typing: false });
  });
  it('browser toolbars growing a little are not a keyboard', () => {
    expect(phoneState({ width: 393, height: 852 }, { height: 800, offsetTop: 0 }, true).typing).toBe(false);
  });
  it('a desk window never counts as typing', () => {
    expect(phoneState({ width: 1400, height: 900 }, { height: 500, offsetTop: 0 }, false).typing).toBe(false);
  });
  it('without a visual viewport nothing is covered', () => {
    expect(phoneState({ width: 393, height: 852 }, null, true)).toMatchObject({ keyboard: 0, height: 852 });
  });
});
