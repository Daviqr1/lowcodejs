import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme-preference');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }
    return 'light'; // Default for SSR
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      return 'dark';
    });
  };

  return { theme, toggleTheme };
}
