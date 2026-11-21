// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Input } from './Input';

afterEach(cleanup);
const label = () => screen.getByText('Search').closest('label') as HTMLElement;

describe('Input floating label', () => {
  it('floats when a controlled value is present at mount (a prefilled search)', () => {
    render(<Input label="Search" value="Horror dark ambient" onChange={() => {}} />);
    expect(label().className).toContain('text-[var(--accent)]');
  });
  it('floats when the page sets the value later, and drops when it is cleared', () => {
    const { rerender } = render(<Input label="Search" value="" onChange={() => {}} />);
    expect(label().className).toContain('text-[var(--fg-muted)]');
    rerender(<Input label="Search" value="eerie" onChange={() => {}} />);
    expect(label().className).toContain('text-[var(--accent)]');
    rerender(<Input label="Search" value="" onChange={() => {}} />);
    expect(label().className).toContain('text-[var(--fg-muted)]');
  });
  it('floats for an uncontrolled defaultValue', () => {
    render(<Input label="Search" defaultValue="x" />);
    expect(label().className).toContain('text-[var(--accent)]');
  });
});
