// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { useFindReplace } from './useFindReplace';

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function setup(text: string) {
  return renderHook(() => {
    const [content, setContent] = useState(text);
    return { content, ...useFindReplace(content, setContent) };
  });
}

describe('useFindReplace', () => {
  it('counts every match, matching case by default, and none for an empty search', () => {
    const { result } = setup('Maya sees MAYA and maya.');
    expect(result.current.findCount).toBe(0);
    act(() => result.current.setFindText('maya'));
    expect(result.current.findCount).toBe(1);
    act(() => result.current.setMatchCase(false));
    expect(result.current.findCount).toBe(3);
  });

  it('treats what is typed as text, not a pattern', () => {
    const { result } = setup('Is it (1+1)? Yes. Is it (1+1)?');
    act(() => result.current.setFindText('(1+1)?'));
    expect(result.current.findCount).toBe(2);
    act(() => result.current.setReplaceText('two'));
    act(() => result.current.replaceAll());
    expect(result.current.content).toBe('Is it two Yes. Is it two');
  });

  it('replaces all matches, and says how many it counted', () => {
    const { result } = setup('Still up. Still here.');
    act(() => { result.current.setFindText('Still'); result.current.setReplaceText('Awake'); });
    act(() => result.current.replaceAll());
    expect(result.current.content).toBe('Awake up. Awake here.');
    expect(toast).toHaveBeenCalledWith('Replaced 2 occurrences', 'success');
  });

  it('replaces one, the first', () => {
    const { result } = setup('a b a b');
    act(() => { result.current.setFindText('a'); result.current.setReplaceText('X'); });
    act(() => result.current.replaceOne());
    expect(result.current.content).toBe('X b a b');
    expect(toast).toHaveBeenCalledWith('Replaced 1 occurrence', 'success');
  });

  it('does nothing without something to find', () => {
    const { result } = setup('same');
    act(() => result.current.replaceAll());
    act(() => result.current.replaceOne());
    expect(result.current.content).toBe('same');
    expect(toast).not.toHaveBeenCalled();
  });

  it('the count is what is replaced, in either case mode', () => {
    const { result } = setup('Maya and MAYA');
    act(() => { result.current.setFindText('maya'); result.current.setReplaceText('Zoe'); });
    expect(result.current.findCount).toBe(0);
    act(() => result.current.replaceAll());
    expect(result.current.content).toBe('Maya and MAYA');
    expect(toast).toHaveBeenCalledWith('Nothing to replace', 'info');
    act(() => result.current.setMatchCase(false));
    expect(result.current.findCount).toBe(2);
    act(() => result.current.replaceAll());
    expect(result.current.content).toBe('Zoe and Zoe');
    expect(toast).toHaveBeenCalledWith('Replaced 2 occurrences', 'success');
  });

  it('a dollar pattern in the replacement is plain text', () => {
    const { result } = setup('cost');
    act(() => { result.current.setFindText('cost'); result.current.setReplaceText('$& and $1'); });
    act(() => result.current.replaceAll());
    expect(result.current.content).toBe('$& and $1');
  });

  it('opens and closes the bar', () => {
    const { result } = setup('x');
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });
});
