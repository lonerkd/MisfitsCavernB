import { describe, it, expect } from 'vitest';
import { getDefaultTitlePage, withScriptTitle } from './titlepage';

describe('withScriptTitle', () => {
  it('uses the script title when the title page was never filled in', () => {
    expect(withScriptTitle(getDefaultTitlePage(), 'Night Shift at the Lantern').title).toBe('Night Shift at the Lantern');
  });
  it('keeps a title someone wrote, and an untitled script', () => {
    expect(withScriptTitle({ ...getDefaultTitlePage(), title: 'The Real Title' }, 'Night Shift').title).toBe('The Real Title');
    expect(withScriptTitle(getDefaultTitlePage(), '  ').title).toBe('Untitled Screenplay');
    expect(withScriptTitle(getDefaultTitlePage(), null).title).toBe('Untitled Screenplay');
  });
});
