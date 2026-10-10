'use client';

// Keeps the page in the chosen theme (lib/themes). The first frame comes from
// this device's copy (painted by the early script in app/layout); then the
// account's choice wins once it loads, so the look follows the person across
// devices. "System" follows the device's light/dark setting as it changes.

import { useEffect } from 'react';
import { useUiPrefs } from '@/lib/os/uiPrefs';
import { THEME_EVENT, applyTheme, readLocalTheme, writeLocalTheme } from '@/lib/themes/themes';

export default function ThemeInitializer() {
  const { prefs, loaded } = useUiPrefs();

  useEffect(() => {
    const apply = () => applyTheme(readLocalTheme());
    apply();
    window.addEventListener(THEME_EVENT, apply);
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    const onSystem = () => { if (readLocalTheme().id === 'system') apply(); };
    media?.addEventListener?.('change', onSystem);
    return () => {
      window.removeEventListener(THEME_EVENT, apply);
      media?.removeEventListener?.('change', onSystem);
    };
  }, []);

  // The account's choice, once known, is the one this device shows too.
  useEffect(() => {
    if (!loaded || !prefs.theme) return;
    if (JSON.stringify(prefs.theme) === JSON.stringify(readLocalTheme())) return;
    writeLocalTheme(prefs.theme);
    applyTheme(prefs.theme);
  }, [loaded, prefs.theme]);

  return null;
}
