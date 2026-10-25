import { describe, it, expect } from 'vitest';
import { checkRateLimit, getClientIp } from './api-rate-limit';

describe('checkRateLimit', () => {
  it('allows the first request and returns remaining count', () => {
    const result = checkRateLimit('test-user');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // maxRequests is 10 by default
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('rejects requests when limit is reached', () => {
    const identifier = 'limit-test-user';
    for (let i = 0; i < 10; i++) {
      checkRateLimit(identifier);
    }
    const result = checkRateLimit(identifier);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('respects custom maxRequests option', () => {
    const identifier = 'custom-limit-user';
    const options = { maxRequests: 5, windowMs: 60_000 };
    
    for (let i = 0; i < 5; i++) {
      checkRateLimit(identifier, options);
    }
    const result = checkRateLimit(identifier, options);
    expect(result.allowed).toBe(false);
  });

  it('respects custom windowMs option', () => {
    const identifier = 'custom-window-user';
    const options = { maxRequests: 10, windowMs: 30_000 };
    
    const result = checkRateLimit(identifier, options);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('returns correct remaining count after each request', () => {
    const identifier = 'remaining-test-user';
    const options = { maxRequests: 5, windowMs: 60_000 };
    
    let result = checkRateLimit(identifier, options);
    expect(result.remaining).toBe(4);
    
    result = checkRateLimit(identifier, options);
    expect(result.remaining).toBe(3);
    
    result = checkRateLimit(identifier, options);
    expect(result.remaining).toBe(2);
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '192.168.1.1');
    expect(getClientIp({ headers })).toBe('192.168.1.1');
  });

  it('extracts first IP from comma-separated x-forwarded-for header', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');
    expect(getClientIp({ headers })).toBe('192.168.1.1');
  });

  it('extracts IP from x-real-ip header when x-forwarded-for is missing', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '10.0.0.5');
    expect(getClientIp({ headers })).toBe('10.0.0.5');
  });

  it('returns unknown when no IP headers are present', () => {
    const headers = new Headers();
    expect(getClientIp({ headers })).toBe('unknown');
  });

  it('trims whitespace from extracted IP', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '  192.168.1.1  ');
    expect(getClientIp({ headers })).toBe('192.168.1.1');
  });
});
