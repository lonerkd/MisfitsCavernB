// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useIslandPopover } from './popover';

function Menu({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const { rootRef, buttonRef } = useIslandPopover<HTMLDivElement>(id, open, () => setOpen(false));
  return (
    <div ref={rootRef}>
      <button ref={buttonRef} onClick={() => setOpen(o => !o)}>{id}</button>
      {open && <div role="dialog" aria-label={`${id} menu`} />}
    </div>
  );
}

const both = () => render(<><Menu id="a" /><Menu id="b" /><p>outside</p></>);

describe('useIslandPopover', () => {
  afterEach(cleanup);
  it('opening one popover closes the other', () => {
    both();
    fireEvent.click(screen.getByText('a'));
    expect(screen.queryByLabelText('a menu')).toBeTruthy();
    fireEvent.click(screen.getByText('b'));
    expect(screen.queryByLabelText('b menu')).toBeTruthy();
    expect(screen.queryByLabelText('a menu')).toBeNull();
  });

  it('Escape closes it and gives focus back to its button', () => {
    both();
    fireEvent.click(screen.getByText('a'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByLabelText('a menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByText('a'));
  });

  it('a press outside closes it, a press inside does not', () => {
    both();
    fireEvent.click(screen.getByText('a'));
    fireEvent.mouseDown(screen.getByLabelText('a menu'));
    expect(screen.queryByLabelText('a menu')).toBeTruthy();
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(screen.queryByLabelText('a menu')).toBeNull();
  });
});
