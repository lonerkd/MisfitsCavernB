// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SPLIT_BUTTON_EVENT,
  SPLIT_BUTTON_KEY,
  readSplitButtonPref,
  splitButtonVisible,
  writeSplitButtonPref,
} from './splitButton';

describe('splitButtonVisible', () => {
  it('an explicit choice wins on every surface', () => {
    expect(splitButtonVisible(true, true)).toBe(true);
    expect(splitButtonVisible(true, false)).toBe(true);
    expect(splitButtonVisible(false, true)).toBe(false);
    expect(splitButtonVisible(false, false)).toBe(false);
  });

  it('unset starts off on compact and on elsewhere', () => {
    expect(splitButtonVisible(null, true)).toBe(false);
    expect(splitButtonVisible(null, false)).toBe(true);
  });
});

describe('the stored choice', () => {
  beforeEach(() => localStorage.clear());

  it('reads null before any choice', () => {
    expect(readSplitButtonPref()).toBeNull();
  });

  it('round-trips a choice', () => {
    writeSplitButtonPref(false);
    expect(localStorage.getItem(SPLIT_BUTTON_KEY)).toBe('0');
    expect(readSplitButtonPref()).toBe(false);
    writeSplitButtonPref(true);
    expect(readSplitButtonPref()).toBe(true);
  });

  it('tells the island when the choice changes', () => {
    let heard = 0;
    const on = () => { heard += 1; };
    window.addEventListener(SPLIT_BUTTON_EVENT, on);
    writeSplitButtonPref(true);
    window.removeEventListener(SPLIT_BUTTON_EVENT, on);
    expect(heard).toBe(1);
  });

  it('junk in storage is no choice', () => {
    localStorage.setItem(SPLIT_BUTTON_KEY, 'banana');
    expect(readSplitButtonPref()).toBeNull();
  });
});
