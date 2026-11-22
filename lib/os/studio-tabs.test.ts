import { describe, expect, it } from 'vitest';
import { resolveStudioTab, visibleStudioTabs } from './studio-tabs';

describe('visibleStudioTabs', () => {
  it('keeps only the notes tabs for a format with no phases', () => {
    expect(visibleStudioTabs({ phased: false })).toEqual(['overview', 'library', 'share']);
    expect(visibleStudioTabs({ phased: false }, { distribution: true })).toEqual(['overview', 'library', 'share']);
  });
  it('keeps every tab for a phased project', () => {
    expect(visibleStudioTabs({ phased: true })).toEqual(['overview', 'library', 'scenes', 'production', 'post', 'promos', 'pitch', 'share']);
  });
  it('hides Promos without the distribution module', () => {
    expect(visibleStudioTabs({ phased: true }, { distribution: false })).not.toContain('promos');
  });
  it('shows every tab while progress has not loaded', () => {
    expect(visibleStudioTabs(null)).toContain('production');
  });
});

describe('resolveStudioTab', () => {
  const notes = visibleStudioTabs({ phased: false });
  it('lands a hidden or unknown tab on the Overview', () => {
    expect(resolveStudioTab('production', notes)).toBe('overview');
    expect(resolveStudioTab('nonsense', notes)).toBe('overview');
    expect(resolveStudioTab(null, notes)).toBe('overview');
  });
  it('keeps a shown tab', () => {
    expect(resolveStudioTab('library', notes)).toBe('library');
  });
});
