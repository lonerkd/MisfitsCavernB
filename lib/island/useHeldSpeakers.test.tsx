// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { SPEAKER_HOLD_MS, useHeldSpeakers } from './useHeldSpeakers';

// What the hook showed after the latest render, recorded from an effect (never assigned during a render).
const shown = { list: [] as string[] };
function Probe({ now }: { now: string[] }) {
  const held = [...useHeldSpeakers(now)].sort();
  useEffect(() => { shown.list = held; });
  return null;
}
const seen = new Proxy([] as string[], { get: (_, key) => (shown.list as never)[key as never], ownKeys: () => Reflect.ownKeys(shown.list), getOwnPropertyDescriptor: (_, key) => Reflect.getOwnPropertyDescriptor(shown.list, key) });
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => { vi.useFakeTimers(); shown.list = []; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useHeldSpeakers', () => {
  it('shows someone the moment they speak (no lag on the way in)', () => {
    render(<Probe now={['ana']} />);
    expect(seen).toEqual(['ana']);
  });

  it('keeps them through a pause between words, then lets go after the hold', () => {
    const view = render(<Probe now={['ana']} />);
    tick(10);
    view.rerender(<Probe now={[]} />); // the meter says quiet
    tick(SPEAKER_HOLD_MS - 100);
    expect(seen).toEqual(['ana']); // a pause is not stopping
    tick(200);
    expect(seen).toEqual([]);
  });

  it('flickering loud-quiet-loud inside the hold never lets go at all', () => {
    const view = render(<Probe now={['ana']} />);
    for (let i = 0; i < 8; i++) {
      tick(10);
      view.rerender(<Probe now={[]} />);
      tick(300);
      expect(seen).toEqual(['ana']);
      view.rerender(<Probe now={['ana']} />);
    }
    expect(seen).toEqual(['ana']);
  });

  it('holds each person on their own: one going quiet does not wait for another', () => {
    const view = render(<Probe now={['ana', 'ben']} />);
    tick(10);
    view.rerender(<Probe now={['ben']} />); // ana stops, ben carries on
    expect(seen).toEqual(['ana', 'ben']); // ana still held
    tick(SPEAKER_HOLD_MS + 100);
    expect(seen).toEqual(['ben']);
  });

  it('a person who has never spoken is never shown', () => {
    render(<Probe now={[]} />);
    tick(5000);
    expect(seen).toEqual([]);
  });
});
