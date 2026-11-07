// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';
import { PhoneElementBar } from '@/components/editor/PhoneElementBar';

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

describe('PhoneElementBar', () => {
  it('one tap inserts the element and keeps the keyboard (pointerdown is cancelled)', () => {
    const insert = vi.fn();
    render(<PhoneElementBar insert={insert} bottom={336} />);
    const bar = screen.getByRole('toolbar', { name: 'Insert an element' });
    expect(bar.style.bottom).toBe('336px');
    const btn = screen.getByRole('button', { name: 'Character' });
    const down = new Event('pointerdown', { bubbles: true, cancelable: true });
    btn.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    fireEvent.click(btn);
    expect(insert).toHaveBeenCalledWith('character');
  });
  it('offers the six elements', () => {
    render(<PhoneElementBar insert={() => {}} bottom={0} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Scene', 'Action', 'Character', 'Dialogue', 'Transition', 'Note']);
  });
});
