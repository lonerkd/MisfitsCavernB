import { describe, it, expect } from 'vitest';
import { TRANSFORMS, stability } from './metamorphic';

describe('TRANSFORMS', () => {
	it('crlf converts LF to CRLF', () => {
		const input = 'a\nb\nc';
		const output = TRANSFORMS.crlf(input);
		expect(output).toBe('a\r\nb\r\nc');
	});

	it('trailingSpaces adds two spaces after each non-empty line', () => {
		const input = 'hello\nworld\n';
		const output = TRANSFORMS.trailingSpaces(input);
		expect(output).toBe('hello  \nworld  \n');
	});

	it('indented adds four spaces before each non-empty line', () => {
		const input = 'a\nb\nc';
		const output = TRANSFORMS.indented(input);
		expect(output).toBe('    a\n    b\n    c');
	});

	it('doubleBlanks inserts an extra blank between consecutive blanks', () => {
		const input = 'a\n\nb';
		const output = TRANSFORMS.doubleBlanks(input);
		expect(output).toBe('a\n\n\nb');
	});

	it('noFinalNewline removes trailing newlines', () => {
		const input = 'hello\nworld\n\n';
		const output = TRANSFORMS.noFinalNewline(input);
		expect(output).toBe('hello\nworld');
	});

	it('leadingBlanks adds two newlines at the start', () => {
		const input = 'hello';
		const output = TRANSFORMS.leadingBlanks(input);
		expect(output).toBe('\n\nhello');
	});
});

describe('stability', () => {
	it('returns a number between 0 and 1', () => {
		const style: any = {};
		const transform = (t: string) => t;
		const result = stability(style, transform);
		expect(result).toBeGreaterThanOrEqual(0);
		expect(result).toBeLessThanOrEqual(1);
	});

	it('identity transform has stability 1', () => {
		const style: any = {};
		const transform = (t: string) => t;
		const result = stability(style, transform);
		expect(result).toBeCloseTo(1, 5);
	});

	it('crlf transform has high stability', () => {
		const style: any = {};
		const transform = TRANSFORMS.crlf;
		const result = stability(style, transform);
		expect(result).toBeGreaterThanOrEqual(0.9);
	});

	it('noFinalNewline transform has high stability', () => {
		const style: any = {};
		const transform = TRANSFORMS.noFinalNewline;
		const result = stability(style, transform);
		expect(result).toBeGreaterThanOrEqual(0.9);
	});
});
