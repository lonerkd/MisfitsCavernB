// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
import { DiscSwitch, Lamp } from './DiscSwitch';

describe('DiscSwitch', () => {
  it('is a switch with the given name, and reports its state', () => {
    render(<DiscSwitch on={false} onChange={() => {}} label="Studio module" />);
    const s = screen.getByRole('switch', { name: 'Studio module' });
    expect(s.getAttribute('aria-checked')).toBe('false');
  });
  it('asks for the opposite state when pressed', () => {
    const onChange = vi.fn();
    render(<DiscSwitch on onChange={onChange} label="x" />);
    fireEvent.click(screen.getByRole('switch', { name: 'x' }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
  it('does nothing while disabled', () => {
    const onChange = vi.fn();
    render(<DiscSwitch on={false} onChange={onChange} label="x" disabled />);
    fireEvent.click(screen.getByRole('switch', { name: 'x' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Lamp (the disc without a button, for chips that carry their own words)', () => {
  it('is hidden from assistive tech and lights up when on', () => {
    const { container, rerender } = render(<Lamp on={false} small />);
    const lamp = container.firstElementChild as HTMLElement;
    expect(lamp.getAttribute('aria-hidden')).toBe('true');
    expect(lamp.style.width).toBe('18px');
    const off = (lamp.firstElementChild as HTMLElement).style.width;
    rerender(<Lamp on small />);
    const on = ((container.firstElementChild as HTMLElement).firstElementChild as HTMLElement).style.width;
    expect(parseInt(on)).toBeGreaterThan(parseInt(off));
  });
});
