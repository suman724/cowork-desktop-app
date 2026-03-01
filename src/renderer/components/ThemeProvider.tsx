import { useEffect, type ReactNode } from 'react';
import { useUIStore } from '../state/ui-store';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);

      const handler = (e: MediaQueryListEvent): void => {
        root.classList.toggle('dark', e.matches);
      };
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return <>{children}</>;
}
