// What a script text box tells the browser about itself. With no attributes at all, iOS Safari treats an unlabelled textarea as a
// possible form field and offers "AutoFill Contact" (the person's email and phone) above the keyboard while they write a screenplay.
// `autocomplete="off"` says this is not a form field; the data-* flags do the same for password managers (1Password, LastPass, Bitwarden).
export const SCRIPT_TEXT_HINTS = {
  autoComplete: 'off',
  autoCorrect: 'off',
  spellCheck: false,
  'data-form-type': 'other',
  'data-lpignore': 'true',
  'data-1p-ignore': true,
} as const;
