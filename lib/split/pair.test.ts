// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { pairOf, validPartner, readPartner, writePartner } from './pair';

describe('the remembered partner per project', () => {
  beforeEach(() => localStorage.clear());
  it('finds the project and the tool beside it, on either side', () => {
    expect(pairOf('/projects/p1', '/editor')).toEqual({ projectId: 'p1', partner: '/editor' });
    expect(pairOf('/studio?tab=post', '/projects/p1')).toEqual({ projectId: 'p1', partner: '/studio?tab=post' });
    expect(pairOf('/editor', '/studio')).toBeNull();
    expect(pairOf('/projects/p1', '/projects/p2')).toBeNull();
  });
  it('refuses the project page, another project and unsafe paths', () => {
    expect(validPartner('p1', '/projects/p1')).toBeNull();
    expect(validPartner('p1', '/studio?project=p2')).toBeNull();
    expect(validPartner('p1', '//evil.test')).toBeNull();
    expect(validPartner('p1', '/split?a=/x')).toBeNull();
    expect(validPartner('p1', '/studio?project=p1&tab=post')).toBe('/studio?project=p1&tab=post');
  });
  it('remembers per project and ignores a bad stored value', () => {
    writePartner('p1', '/studio?tab=library');
    writePartner('p2', '/editor');
    expect(readPartner('p1')).toBe('/studio?tab=library');
    expect(readPartner('p2')).toBe('/editor');
    expect(readPartner('p3')).toBeNull();
    localStorage.setItem('mc_pair_partner_p1', 'https://evil.test');
    expect(readPartner('p1')).toBeNull();
    writePartner('p1', '/projects/p1');
    expect(localStorage.getItem('mc_pair_partner_p1')).toBe('https://evil.test');
  });
});
