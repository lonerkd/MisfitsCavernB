import { describe, it, expect } from 'vitest';
import { contextFromCastings, contextFromProject, contextFromPlaces, contextWithMemory, contextKey } from './context';

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
});

describe('contextFromPlaces', () => {
	it('extracts place names, upper-cased and deduplicated', () => {
		const result = contextFromPlaces([{ name: 'room' }, { name: 'ROOM ' }, { name: 'Pier' }, { name: '  ' }]);
		expect(result).toEqual({ places: ['ROOM', 'PIER'] });
	});

	it('returns empty places for empty input', () => {
		const result = contextFromPlaces([]);
		expect(result).toEqual({ places: [] });
	});
});

describe('contextWithMemory', () => {
	it('merges project context with writer memory and line overrides', () => {
		const projectContext = { characters: ['ALICE'], rejectedNames: ['BOB'] };
		const writerMemory = {
			confirmedNames: ['CHARLIE'],
			rejectedNames: ['DAVE'],
			titleCaseCues: [],
			colonCues: [],
			extensions: [],
			transitionPatterns: [],
		};
		const lineOverrides = [{ line_index: 5, forced_type: 'dialogue' }];
		const places = [{ name: 'room' }];
		const previousDraftCues = [{ line_index: 10, name: 'EVE' }];

		const result = contextWithMemory(projectContext, writerMemory, lineOverrides, places, previousDraftCues);
		expect(result.characters).toContain('ALICE');
		expect(result.characters).toContain('CHARLIE');
		expect(result.rejectedNames).toContain('BOB');
		expect(result.rejectedNames).toContain('DAVE');
		expect(result.places).toEqual(['ROOM']);
		expect(result.previousDraftCues).toEqual(previousDraftCues);
		expect(result.writerMemory).toBe(writerMemory);
		expect(result.lineOverrides).toEqual(lineOverrides);
	});

	it('works with undefined optional params', () => {
		const result = contextWithMemory({ characters: ['ALICE'], rejectedNames: [] }, undefined, undefined, undefined, undefined);
		expect(result.characters).toEqual(['ALICE']);
		expect(result.rejectedNames).toEqual([]);
		expect(result.places).toBeUndefined();
		expect(result.previousDraftCues).toBeUndefined();
		expect(result.writerMemory).toBeUndefined();
		expect(result.lineOverrides).toBeUndefined();
	});
});

describe('contextKey', () => {
	it('generates a stable key from a context object', () => {
		const context = { characters: ['ALICE', 'BOB'], rejectedNames: ['CHARLIE'] };
		const key = contextKey(context);
		expect(key).toEqual('ALICE|BOB#CHARLIE##0##');
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
		expect(key).toEqual('###0##');
	});

	it('handles context with only characters', () => {
		const context = { characters: ['ALICE'], rejectedNames: [] };
		const key = contextKey(context);
		expect(key).toEqual('ALICE###0##');
	});

	it('handles context with only rejectedNames', () => {
		const context = { characters: [], rejectedNames: ['BOB'] };
		const key = contextKey(context);
		expect(key).toEqual('#BOB##0##');
	});
});
