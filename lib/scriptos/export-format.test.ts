import { describe, it, expect } from 'vitest';
import { reemitsAsFountain } from './export';

describe('reemitsAsFountain', () => {
  it('only screenplay-read formats go through the Fountain emitter', () => {
    expect(reemitsAsFountain('screenplay')).toBe(true);
    expect(reemitsAsFountain(undefined)).toBe(true);
    expect(reemitsAsFountain('teleplay')).toBe(true);
    for (const f of ['podcast', 'copy', 'doc-outline', 'video-script', 'prose', 'game-script']) expect(reemitsAsFountain(f)).toBe(false);
  });
});

import { exportChoicesFor, exportChoiceLabel } from './export';
describe('exportChoicesFor', () => {
  it('offers Final Draft only to screenplay-read formats', () => {
    expect(exportChoicesFor('screenplay')).toContain('fdx');
    expect(exportChoicesFor(undefined)).toContain('fdx');
    expect(exportChoicesFor('podcast')).not.toContain('fdx');
    expect(exportChoicesFor('copy')).toEqual(['pdf', 'txt', 'fountain']);
  });

  it('offers a video script its publish package, and an article its publish-ready files', () => {
    expect(exportChoicesFor('video-script')).toEqual(['pdf', 'publish', 'txt']);
    expect(exportChoicesFor('prose')).toEqual(['pdf', 'md', 'html', 'txt']);
  });

  it('labels the package choices in words, not as file extensions', () => {
    expect(exportChoiceLabel('publish')).toBe('Publish package (.md)');
    expect(exportChoiceLabel('md')).toBe('Markdown (.md)');
    expect(exportChoiceLabel('html')).toBe('HTML article (.html)');
    expect(exportChoiceLabel('pdf')).toBe('PDF');
  });

  it('offers a game script its build sheet, and no Fountain (a screenplay notation)', () => {
    expect(exportChoicesFor('game-script')).toEqual(['pdf', 'build', 'txt']);
    expect(exportChoiceLabel('build')).toBe('Build sheet (.md)');
  });
});
