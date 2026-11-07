// The island can ask for the note box before the panel exists (a tab still loading): the request waits here until a panel takes it.
export const NOTE_FOCUS_EVENT = 'mc-notes-focus';
let wanted = false;

export function requestNoteFocus(): void {
  wanted = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTE_FOCUS_EVENT));
}
export const noteFocusWanted = (): boolean => wanted;
export const noteFocusDone = (): void => { wanted = false; };
