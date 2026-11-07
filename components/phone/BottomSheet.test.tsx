// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

afterEach(cleanup);

describe('BottomSheet', () => {
  it('renders nothing when closed, a labelled modal dialog when open', () => {
    const { rerender } = render(<BottomSheet open={false} onClose={() => {}} title="Tools">x</BottomSheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<BottomSheet open onClose={() => {}} title="Tools">body</BottomSheet>);
    const d = screen.getByRole('dialog', { name: 'Tools' });
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('body')).toBeTruthy();
  });
  it('closes on Escape, on its close button and on the backdrop', () => {
    const onClose = vi.fn();
    const { container } = render(<BottomSheet open onClose={onClose} title="T">b</BottomSheet>);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(container.querySelector('[aria-hidden]') as Element);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
  it('sits above the keyboard', () => {
    render(<BottomSheet open onClose={() => {}} title="T" keyboard={300}>b</BottomSheet>);
    expect(screen.getByRole('dialog').style.bottom).toBe('300px');
  });
  it('the close button is a thumb target (44 px)', () => {
    render(<BottomSheet open onClose={() => {}} title="T">b</BottomSheet>);
    const b = screen.getByRole('button', { name: 'Close' });
    expect(b.style.width).toBe('44px');
    expect(b.style.height).toBe('44px');
  });
});
