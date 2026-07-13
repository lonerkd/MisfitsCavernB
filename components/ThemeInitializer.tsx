'use client';

import { useEffect } from 'react';

export default function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem('mc_theme') || 'default';

      document.body.classList.forEach(className => {
        if (className.startsWith('theme-')) {
          document.body.classList.remove(className);
        }
      });

      if (theme === 'custom') {
        const bg = localStorage.getItem('mc_theme_custom_bg') || '#040710';
        const accent = localStorage.getItem('mc_theme_custom_accent') || '#d7340b';

        document.documentElement.style.setProperty('--bg', bg);
        document.documentElement.style.setProperty('--bg-2', bg);
        document.documentElement.style.setProperty('--accent', accent);
      } else {

        document.documentElement.style.removeProperty('--bg');
        document.documentElement.style.removeProperty('--bg-2');
        document.documentElement.style.removeProperty('--accent');

        if (theme !== 'default') {
          document.body.classList.add(`theme-${theme}`);
        }
      }
    };

    applyTheme();

    window.addEventListener('mc-theme-change', applyTheme);
    return () => window.removeEventListener('mc-theme-change', applyTheme);
  }, []);

  return null;
}
