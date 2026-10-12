// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useEditUndo } from './useEditUndo';
import { MAX_HISTORY } from './editorPageParts';

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });

/** A script's text with undo, driven as the editor drives it: note the edit, then set the text. */
function setup(initialScript = 's1') {
  return renderHook(({ scriptId }) => {
    const [content, setContent] = useState('a');
    const u = useEditUndo(scriptId, content, setContent);
    const edit = (next: string) => { u.noteEdit(content); setContent(next); };
    return { content, setContent, edit, ...u };
  }, { initialProps: { scriptId: initialScript } });
}
const pause = () => act(() => { vi.advanceTimersByTime(700); });

describe('useEditUndo', () => {
  it('undoes and redoes an edit', () => {
    const { result } = setup();
    act(() => result.current.edit('ab'));
    pause();
    act(() => result.current.undo());
    expect(result.current.content).toBe('a');
    act(() => result.current.redo());
    expect(result.current.content).toBe('ab');
  });

  it('groups a burst of typing into one step, split by a pause', () => {
    const { result } = setup();
    act(() => result.current.edit('ab'));
    act(() => { vi.advanceTimersByTime(200); });
    act(() => result.current.edit('abc'));
    pause();
    act(() => result.current.edit('abcd'));
    pause();
    act(() => result.current.undo());
    expect(result.current.content).toBe('abc');
    act(() => result.current.undo());
    expect(result.current.content).toBe('a');
  });

  it('undoes typing that has not paused yet', () => {
    const { result } = setup();
    act(() => result.current.edit('ab'));
    act(() => result.current.undo());
    expect(result.current.content).toBe('a');
  });

  it('does nothing with no history, and a new edit clears what could be redone', () => {
    const { result } = setup();
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.content).toBe('a');
    act(() => result.current.edit('ab'));
    pause();
    act(() => result.current.undo());
    act(() => result.current.edit('ax'));
    pause();
    act(() => result.current.redo());
    expect(result.current.content).toBe('ax');
  });

  it('commit makes a one-step change undoable in one step', () => {
    const { result } = setup();
    act(() => { result.current.commit('a'); result.current.setContent('A, formatted'); });
    act(() => result.current.undo());
    expect(result.current.content).toBe('a');
  });

  it('keeps only the last MAX_HISTORY steps', () => {
    const { result } = setup();
    for (let i = 1; i <= MAX_HISTORY + 5; i++) { act(() => result.current.edit('a' + 'b'.repeat(i))); pause(); }
    for (let i = 0; i < MAX_HISTORY + 5; i++) act(() => result.current.undo());
    // The oldest steps were dropped: it cannot get all the way back to 'a'.
    expect(result.current.content).not.toBe('a');
    expect(result.current.content).toBe('a' + 'b'.repeat(5));
  });

  it('starts fresh when the script changes', () => {
    const { result, rerender } = setup('s1');
    act(() => result.current.edit('ab'));
    pause();
    rerender({ scriptId: 's2' });
    act(() => result.current.undo());
    expect(result.current.content).toBe('ab');
  });
});
