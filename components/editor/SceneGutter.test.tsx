// @vitest-environment jsdom
import React, { useRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const layout = vi.hoisted(() => ({ phone: false }));
vi.mock('@/lib/os/usePhone', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/os/usePhone')>();
  return {
    ...actual,
    usePhoneLayout: () => ({ phone: layout.phone, landscape: false, keyboard: 0, typing: false, height: 500, offset: 0 }),
  };
});
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

import { SceneGutter } from '@/components/editor/SceneGutter';
import type { GutterItem } from '@/lib/film/gutter';

const item: GutterItem = { line: 0, day: 1, time: 'dusk', shoot: 1, guessed: false, cost: null };

function Harness() {
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  return (
    <>
      <div ref={highlightRef}><div>EXT. BOARDING HOUSE - DUSK</div></div>
      <textarea ref={textareaRef} defaultValue="EXT. BOARDING HOUSE - DUSK" />
      <SceneGutter items={[item]} highlightRef={highlightRef} textareaRef={textareaRef} content="EXT. BOARDING HOUSE - DUSK" />
    </>
  );
}

describe('the scene gutter (ScriptOS margin read)', () => {
  beforeEach(() => { cleanup(); layout.phone = false; });

  it('on a desk it sits in the margin beside the heading', () => {
    const { container } = render(<Harness />);
    const note = container.querySelector('[role="note"]');
    expect(note?.getAttribute('aria-label')).toBe('story day 1, dusk, shoot day 1');
    expect(note?.textContent).toContain('Day 1');
    expect(note?.textContent).toContain('Shoot 1');
  });

  it('on a phone it never renders — there is no margin, and the labels landed on the script', () => {
    layout.phone = true;
    const { container } = render(<Harness />);
    expect(container.querySelector('[role="note"]')).toBeNull();
    expect(container.querySelector('[role="group"]')).toBeNull();
  });
});
