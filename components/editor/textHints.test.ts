import { describe, it, expect } from 'vitest';
import { SCRIPT_TEXT_HINTS } from './textHints';

describe('SCRIPT_TEXT_HINTS', () => {
  it('says the script box is not a form field, so iOS does not offer to AutoFill a contact into it', () => {
    expect(SCRIPT_TEXT_HINTS.autoComplete).toBe('off');
    expect(SCRIPT_TEXT_HINTS['data-form-type']).toBe('other');
  });
});
