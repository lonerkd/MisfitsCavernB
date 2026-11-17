// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
import { DiscSwitch } from './DiscSwitch';

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
