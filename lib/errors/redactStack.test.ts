import { describe, expect, it } from 'vitest';
import { redactStack } from './redactStack';

const JWT = ['eyJ' + 'hbGciOiJIUzI1NiJ9', 'eyJ' + 'zdWIiOiIxMjM0NTY3ODkwIn0', 'x'.repeat(43)].join('.') // a fake token, built so secret scanners do not flag a literal;

describe('redactStack', () => {
  it('drops the origin, the path and the query of a Chrome frame but keeps the file and position', () => {
    const out = redactStack('Error: x\n    at render (https://app.example.com/_next/static/chunks/page-1a2b.js?v=abc123:10:5)');
    expect(out).toBe('Error: x\n    at render ([origin]/page-1a2b.js:10:5)');
  });

  it('handles a Firefox frame and a webpack-internal one', () => {
    expect(redactStack('render@https://app.example.com/_next/static/chunks/app.js:3:9'))
      .toBe('render@[origin]/app.js:3:9');
    expect(redactStack('at f (webpack-internal:///./app/studio/page.tsx:12:3)')).toBe('at f ([origin]/page.tsx:12:3)');
  });

  it('cuts absolute paths, POSIX and Windows, down to the file name', () => {
    expect(redactStack('at x (/home/runner/work/app/lib/a.ts:1:2)')).toBe('at x (/a.ts:1:2)');
    expect(redactStack('at x (C:\\Users\\sam\\app\\lib\\a.ts:1:2)')).toBe('at x (/a.ts:1:2)');
    expect(redactStack('at x (file:///C:/Users/sam/app/lib/a.ts:1:2)')).toBe('at x ([origin]/a.ts:1:2)');
  });

  it('removes a query string, including one that carries a token', () => {
    const out = redactStack('at x (https://h.io/a.js?token=secret&next=1:4:2)');
    expect(out).not.toContain('secret');
    expect(out).not.toContain('?');
    expect(out).toContain(':4:2');
  });

  it('removes JWTs, long hex and long base64 runs, and emails', () => {
    const out = redactStack(`msg ${JWT} key=${'ab12'.repeat(10)} id=${'Zx9_'.repeat(12)} who=jo.smith+x@mail.example.com`);
    expect(out).toBe('msg [token] key=[token] id=[token] who=[email]');
  });

  it('redacts the sample the integration test sends to the database', () => {
    const stack = [
      'Error: boom',
      '    at render (https://app.example.com/_next/static/chunks/page-1a2b.js?access_token=SECRETQ&v=1:10:5)',
      '    at run (C:\\Users\\sam\\app\\lib\\run.ts:3:9)',
      '    at go (/home/runner/work/app/lib/go.ts:7:1)',
      `    at who (jo.smith+x@mail.example.com ${JWT} ${'ab12'.repeat(10)})`,
    ].join('\n');
    expect(redactStack(stack)).toBe([
      'Error: boom',
      '    at render ([origin]/page-1a2b.js:10:5)',
      '    at run (/run.ts:3:9)',
      '    at go (/go.ts:7:1)',
      '    at who ([email] [token] [token])',
    ].join('\n'));
  });

  it('leaves an ordinary stack alone', () => {
    const plain = 'TypeError: x is undefined\n    at Object.run (page.js:10:5)\n    at async Promise.all (index 0)';
    expect(redactStack(plain)).toBe(plain);
    expect(redactStack('')).toBe('');
  });
});
