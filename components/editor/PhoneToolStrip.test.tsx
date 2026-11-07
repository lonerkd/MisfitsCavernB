// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PhoneToolStrip, type PhoneToolStripProps } from './PhoneToolStrip';

afterEach(cleanup);
const fns = () => ({ insert: vi.fn(), cycle: vi.fn(), undo: vi.fn(), redo: vi.fn(), lineUp: vi.fn(), lineDown: vi.fn(), prevScene: vi.fn(), nextScene: vi.fn(), find: vi.fn(), notes: vi.fn(), tools: vi.fn(), more: vi.fn(), hideKeyboard: vi.fn() });
const mount = (over: Partial<PhoneToolStripProps> = {}) => { const f = fns(); render(<PhoneToolStrip bottom={336} {...f} {...over} />); return f; };

describe('PhoneToolStrip', () => {
  it('sits on top of the keyboard', () => {
    mount();
    expect(screen.getByRole('toolbar', { name: 'Writing tools' }).style.bottom).toBe('336px');
  });
  it('every tool a phone keyboard lacks is one tap away', () => {
    const f = mount();
    const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
    tap('Put the keyboard away'); tap('Undo'); tap('Redo'); tap('Change element type'); tap('Previous scene'); tap('Next scene'); tap('Line up'); tap('Line down');
    tap('Find and replace'); tap('Notes'); tap('Tools'); tap('More');
    expect(f.hideKeyboard).toHaveBeenCalledOnce(); expect(f.undo).toHaveBeenCalledOnce(); expect(f.redo).toHaveBeenCalledOnce();
    expect(f.cycle).toHaveBeenCalledWith(false); expect(f.prevScene).toHaveBeenCalledOnce(); expect(f.nextScene).toHaveBeenCalledOnce(); expect(f.lineUp).toHaveBeenCalledOnce(); expect(f.lineDown).toHaveBeenCalledOnce();
    expect(f.find).toHaveBeenCalledOnce(); expect(f.notes).toHaveBeenCalledOnce(); expect(f.tools).toHaveBeenCalledOnce(); expect(f.more).toHaveBeenCalledOnce();
  });
  it('inserts each element by name', () => {
    const f = mount();
    for (const [label, type] of [['Scene', 'scene'], ['Action', 'action'], ['Character', 'character'], ['Dialogue', 'dialogue'], ['Transition', 'transition']]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(f.insert).toHaveBeenLastCalledWith(type);
    }
  });
  it('cancels pointerdown on every button so the keyboard and the caret stay', () => {
    mount();
    for (const b of screen.getAllByRole('button')) {
      const down = new Event('pointerdown', { bubbles: true, cancelable: true });
      b.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
    }
  });
  it('compact (landscape) buttons are still at least 40 pt', () => {
    mount({ compact: true });
    for (const b of screen.getAllByRole('button')) expect(Number.parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(40);
  });
});
