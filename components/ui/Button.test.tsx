// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Button ripple', () => {
  it('clears its pending ripple timer on unmount, so nothing fires after teardown', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onClick = vi.fn();
    const { unmount } = render(<Button onClick={onClick}>Save</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    // Unmount while the 600 ms ripple timer is still pending.
    const pendingBefore = vi.getTimerCount();
    expect(pendingBefore).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBeLessThan(pendingBefore);

    expect(() => {
      act(() => { vi.advanceTimersByTime(1000); });
    }).not.toThrow();
    expect(errors).not.toHaveBeenCalled();
  });
});
