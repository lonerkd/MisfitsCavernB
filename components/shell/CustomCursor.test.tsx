// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import CustomCursor from './CustomCursor';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('hover: hover'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.body.className = ''; });

describe('CustomCursor', () => {
  it('does not blend against the page (that inverted it on light themes) and keeps a halo in the page colour', () => {
    const { container } = render(<CustomCursor />);
    act(() => { document.body.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10, bubbles: true })); });
    const parts = Array.from(container.querySelectorAll<HTMLElement>('div[aria-hidden]'));
    expect(parts).toHaveLength(2);
    for (const el of parts) expect(el.style.mixBlendMode).not.toBe('difference');
    const dot = parts[0];
    expect(dot.style.boxShadow).toContain('var(--bg)');
    expect(dot.style.background).toContain('var(--fg)');
  });
  it('draws nothing without a fine pointer', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<CustomCursor />);
    expect(container.querySelectorAll('div[aria-hidden]')).toHaveLength(0);
  });
});
