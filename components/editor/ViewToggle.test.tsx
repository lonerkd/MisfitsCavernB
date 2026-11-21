// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ViewToggle } from './EditorSidePanels';

afterEach(cleanup);

describe('ViewToggle', () => {
  it('is a switch with state, 44 pt tall, and flips on click', () => {
    const set = vi.fn();
    render(<ViewToggle label="Typewriter mode" on={false} set={set} />);
    const sw = screen.getByRole('switch', { name: /Typewriter mode/ });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.style.minHeight).toBe('44px');
    fireEvent.click(sw);
    expect(set).toHaveBeenCalledWith(true);
  });
  it('reports on', () => {
    render(<ViewToggle label="Dark page in Preview" on set={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });
});
