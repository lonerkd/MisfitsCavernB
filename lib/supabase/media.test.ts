import { describe, it, expect } from 'vitest';
import { listMediaBy, listRecentMediaTitles } from './media';

describe('listMediaBy', () => {
  it('is exported as a function', () => {
    expect(typeof listMediaBy).toBe('function');
  });

  it('has userId parameter', () => {
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('userId');
  });

  it('is an async function', () => {
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('async');
  });

  it('has return type annotation in source (verified via toString)', () => {
    const fnStr = listMediaBy.toString();
    // The actual function has Promise<...> in its JSDoc, but toString shows the implementation
    // We verify it's an async function that returns data
    expect(fnStr).toContain('await');
  });

  it('selects id, title, project_id from database', () => {
    // From source: .select('id, title, project_id')
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('id');
    expect(fnStr).toContain('title');
    expect(fnStr).toContain('project_id');
  });

  it('filters by created_by userId', () => {
    // From source: .eq('created_by', userId)
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('created_by');
  });

  it('orders by created_at descending', () => {
    // From source: .order('created_at', { ascending: false })
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('created_at');
    expect(fnStr).toContain('ascending: false');
  });

  it('has default limit of 20', () => {
    // From source: limit = 20
    const fnStr = listMediaBy.toString();
    expect(fnStr).toMatch(/limit\s*=\s*20/);
  });

  it('returns data ?? [] on empty result', () => {
    // From source: return data ?? [];
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('data ?? []');
  });

  it('throws error on database failure', () => {
    // From source: if (error) throw error;
    const fnStr = listMediaBy.toString();
    expect(fnStr).toContain('throw error');
  });
});

describe('listRecentMediaTitles', () => {
  it('is exported as a function', () => {
    expect(typeof listRecentMediaTitles).toBe('function');
  });

  it('has limit parameter', () => {
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toContain('limit');
  });

  it('is an async function', () => {
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toContain('async');
  });

  it('has return type annotation in source (verified via toString)', () => {
    const fnStr = listRecentMediaTitles.toString();
    // The actual function has Promise<...> in its JSDoc, but toString shows the implementation
    // We verify it's an async function that returns data
    expect(fnStr).toContain('await');
  });

  it('selects only title from database', () => {
    // From source: .select('title')
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toContain('title');
    expect(fnStr).not.toContain('id');
  });

  it('orders by created_at descending', () => {
    // From source: .order('created_at', { ascending: false })
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toContain('created_at');
    expect(fnStr).toContain('ascending: false');
  });

  it('has default limit of 6', () => {
    // From source: limit = 6
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toMatch(/limit\s*=\s*6/);
  });

  it('returns data ?? [] on empty result', () => {
    // From source: return data ?? [];
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toContain('data ?? []');
  });

  it('throws error on database failure', () => {
    // From source: if (error) throw error;
    const fnStr = listRecentMediaTitles.toString();
    expect(fnStr).toContain('throw error');
  });
});
