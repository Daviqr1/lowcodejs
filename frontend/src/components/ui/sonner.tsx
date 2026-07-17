import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function useDocumentTheme(): ToasterProps['theme'] {
  // Inicializa com valor estavel (igual no server e no primeiro render client)
  // para evitar hydration mismatch na raiz do documento. O tema real e
  // sincronizado apos o mount, ja no client.
  const [theme, setTheme] = useState<ToasterProps['theme']>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    const themeByMode = { true: 'dark', false: 'light' } as const;

    const sync = (): void => {
      const isDark = root.classList.contains('dark');
      setTheme(themeByMode[`${isDark}`]);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

const Toaster = ({ ...props }: ToasterProps): React.JSX.Element => {
  const theme = useDocumentTheme();

  return (
    <Sonner
      theme={theme}
      richColors
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={{ '--border-radius': 'var(--radius)' } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
