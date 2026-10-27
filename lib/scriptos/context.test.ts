import { describe, it, expect } from 'vitest';
import { contextFromCastings, contextFromProject, contextKey } from './context';
import { parseScript } from './parser';

describe('contextFromCastings', () => {
	it('extracts character names from castings array', () => {
		const castings = [
			{ character_name: 'Alice' },
			{ character_name: 'Bob' },
			{ character_name: 'Charlie' },
		];
		const result = contextFromCastings(castings);
		expect(result.characters).toEqual(['ALICE', 'BOB', 'CHARLIE']);
	});

	it('filters out empty or whitespace-only names', () => {
		const castings = [
			{ character_name: 'Alice' },
			{ character_name: '' },
			{ character_name: '   ' },
			{ character_name: 'Bob' },
		];
		const result = contextFromCastings(castings);
		expect(result.characters).toEqual(['ALICE', 'BOB']);
	});

	it('deduplicates names appearing multiple times', () => {
		const castings = [
			{ character_name: 'Alice' },
			{ character_name: 'alice' },
			{ character_name: 'ALICE' },
		];
		const result = contextFromCastings(castings);
		expect(result.characters).toEqual(['ALICE']);
	});

	it('handles empty castings array', () => {
		const castings: Array<{ character_name: string }> = [];
		const result = contextFromCastings(castings);
		expect(result.characters).toEqual([]);
	});

	it('transforms rejectedNames to uppercase and filters empty', () => {
		const castings = [{ character_name: 'Alice' }];
		const result = contextFromCastings(castings, ['  bob  ', '', 'CHARLIE']);
		expect(result.rejectedNames).toEqual(['BOB', 'CHARLIE']);
	});

	it('handles empty rejectedNames array', () => {
		const castings = [{ character_name: 'Alice' }];
		const result = contextFromCastings(castings, []);
		expect(result.rejectedNames).toEqual([]);
	});
});

describe('contextFromProject', () => {
	it('merges confirmed characters with existing castings', () => {
		const castings = [{ character_name: 'Alice' }];
		const corrections = [
			{ kind: 'character', name: 'Bob' },
			{ kind: 'not_character', name: 'Charlie' },
		];
		const result = contextFromProject(castings, corrections);
		expect(result.characters).toEqual(['ALICE', 'BOB']);
		expect(result.rejectedNames).toEqual(['CHARLIE']);
	});

	it('handles empty corrections array', () => {
		const castings = [{ character_name: 'Alice' }];
		const result = contextFromProject(castings, []);
		expect(result.characters).toEqual(['ALICE']);
		expect(result.rejectedNames).toEqual([]);
	});

	it('handles empty castings with corrections', () => {
		const castings: Array<{ character_name: string }> = [];
		const corrections = [
			{ kind: 'character', name: 'Alice' },
			{ kind: 'not_character', name: 'Bob' },
		];
		const result = contextFromProject(castings, corrections);
		expect(result.characters).toEqual(['ALICE']);
		expect(result.rejectedNames).toEqual(['BOB']);
	});

	it('filters confirmed characters to uppercase only', () => {
		const castings = [{ character_name: 'Alice' }];
		const corrections = [
			{ kind: 'character', name: 'bob' },
			{ kind: 'not_character', name: 'Charlie' },
		];
		const result = contextFromProject(castings, corrections);
		expect(result.characters).toEqual(['ALICE', 'BOB']);
	});

	it('handles mixed case in confirmed characters', () => {
		const castings = [{ character_name: 'Alice' }];
		const corrections = [
			{ kind: 'character', name: 'Bob' },
			{ kind: 'character', name: 'bob' },
		];
		const result = contextFromProject(castings, corrections);
		expect(result.characters).toEqual(['ALICE', 'BOB']);
	});

	it('uses repeated confident cues from a previous draft as weaker prior evidence', () => {
		const previous = 'INT. ROOM - DAY\n\nMAYA\nHello.\n\nMAYA\nAgain.\n';
		const result = contextFromProject([], [], [], previous);
		expect(result.previousCharacters).toEqual(['MAYA']);
		const current = parseScript('INT. ROOM - DAY\n\nMaya\nThird time.\n');
		const withPrior = parseScript('INT. ROOM - DAY\n\nMaya\nThird time.\n', 'screenplay', undefined, { context: result });
		expect(current.lines.find((line) => line.text === 'Maya')?.type).toBe('action');
		expect(withPrior.lines.find((line) => line.text === 'Maya')?.type).toBe('character');
	});

	it('uses project locations only to canonicalize an already parsed scene location', () => {
		const source = 'INT. kitchen - DAY\n\nMaya waits.\n';
		const withPlaces = contextFromProject([], [], [{ name: 'KITCHEN' }]);
		const plain = parseScript(source);
		const known = parseScript(source, 'screenplay', undefined, { context: withPlaces });
		expect(known.scenes.map((scene) => scene.heading)).toEqual(plain.scenes.map((scene) => scene.heading));
		expect(known.scenes[0].location).toBe('KITCHEN');
	});
});

describe('contextKey', () => {
	it('generates a stable key from a context object', () => {
		const context = { characters: ['ALICE', 'BOB'], rejectedNames: ['CHARLIE'] };
		const key = contextKey(context);
		expect(key).toEqual('ALICE|BOB#CHARLIE');
	});

	it('returns empty string for undefined context', () => {
		const key = contextKey(undefined);
		expect(key).toEqual('');
	});

	it('returns empty string for null context', () => {
		const key = contextKey(null as any);
		expect(key).toEqual('');
	});

	it('handles context with no characters and no rejectedNames', () => {
		const context = { characters: [], rejectedNames: [] };
		const key = contextKey(context);
		expect(key).toEqual('#');
	});

	it('handles context with only characters', () => {
		const context = { characters: ['ALICE'], rejectedNames: [] };
		const key = contextKey(context);
		expect(key).toEqual('ALICE#');
	});

	it('handles context with only rejectedNames', () => {
		const context = { characters: [], rejectedNames: ['BOB'] };
		const key = contextKey(context);
		expect(key).toEqual('#BOB');
	});

  it('includes locations and previous-draft names in its stable key', () => {
    expect(contextKey({ places: ['KITCHEN'] })).not.toBe(contextKey({ places: ['OFFICE'] }));
    expect(contextKey({ previousCharacters: ['MAYA'] })).not.toBe(contextKey({ previousCharacters: ['LEO'] }));
  });
});
