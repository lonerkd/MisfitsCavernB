// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PixelLoader } from '@/components/brand/PixelLoader';

describe('the pixel-art loader (owner, Nov 26, 2026)', () => {
  it('is an accessible wait: a progressbar with a name, the art itself hidden', () => {
    const { container } = render(<PixelLoader label="Entering the Lounge" />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute('aria-label')).toBe('Entering the Lounge');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('the orbit variant sends the star around the peaks, twinkling', () => {
    const { container } = render(<PixelLoader variant="orbit" />);
    expect(container.querySelector('.mc-pixel-orbit')).not.toBeNull();
    expect(container.querySelector('.mc-pixel-orbit .mc-pixel-twinkle')).not.toBeNull();
  });

  it('the twinkle variant keeps the star in place — no orbit', () => {
    const { container } = render(<PixelLoader variant="twinkle" />);
    expect(container.querySelector('.mc-pixel-orbit')).toBeNull();
    expect(container.querySelector('.mc-pixel-twinkle')).not.toBeNull();
  });

  it('the spin variant turns the whole stamp and carries no star', () => {
    const { container } = render(<PixelLoader variant="spin" />);
    expect(container.querySelector('[role="progressbar"]')?.className).toContain('mc-pixel-spin');
    expect(container.querySelector('.mc-pixel-twinkle')).toBeNull();
  });

  it('every motion is stepped, and reduced motion stands the loader still', () => {
    const { container } = render(<PixelLoader />);
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('steps(16)');
    expect(css).toContain('steps(8)');
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation: none/);
  });
});
