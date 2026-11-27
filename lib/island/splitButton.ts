// The split-screen button in the island's deck: a per-device choice (Settings ›
// Appearance), kept in localStorage like the island's size. Unset is not simply
// "on": on the compact surface the button starts OFF — split panes on a phone
// squeeze two pages into a space neither fits (the owner's shots, Nov 26, 2026) —
// while a desk starts with it on. An explicit choice in Settings always wins, on
// every surface. The Ctrl+\ shortcut is not the button and is untouched by this.

export const SPLIT_BUTTON_KEY = 'mc_island_split_button';
export const SPLIT_BUTTON_EVENT = 'mc-island-split-button-change';

/** The stored choice: true/false once the person has chosen, null while they never have. */
export function readSplitButtonPref(): boolean | null {
  try {
    const v = localStorage.getItem(SPLIT_BUTTON_KEY);
    return v === '1' ? true : v === '0' ? false : null;
  } catch { return null; }
}

/** Saves the choice on this device and tells the island, which redraws at once. */
export function writeSplitButtonPref(show: boolean): boolean {
  try { localStorage.setItem(SPLIT_BUTTON_KEY, show ? '1' : '0'); } catch {}
  window.dispatchEvent(new Event(SPLIT_BUTTON_EVENT));
  return show;
}

/** Whether the button stands in the deck: the stored choice, else off on compact, on elsewhere. */
export function splitButtonVisible(pref: boolean | null, compact: boolean): boolean {
  return pref ?? !compact;
}
