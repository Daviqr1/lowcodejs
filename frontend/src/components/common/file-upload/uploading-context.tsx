import * as React from 'react';

type UploadingContextValue = {
  registerUpload: (key: string) => void;
  unregisterUpload: (key: string) => void;
  isUploading: boolean;
};

const UploadingContext = React.createContext<UploadingContextValue | null>(
  null,
);

export function UploadingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [uploads, setUploads] = React.useState<Set<string>>(new Set());

  const registerUpload = React.useCallback((key: string) => {
    setUploads((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const unregisterUpload = React.useCallback((key: string) => {
    setUploads((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({
      registerUpload,
      unregisterUpload,
      isUploading: uploads.size > 0,
    }),
    [registerUpload, unregisterUpload, uploads.size],
  );

  return (
    <UploadingContext.Provider
      data-slot="uploading-context"
      value={value}
    >
      {children}
    </UploadingContext.Provider>
  );
}

export function useUploadingContext(): UploadingContextValue | null {
  return React.use(UploadingContext);
}

export function useIsUploading(): boolean {
  const ctx = React.use(UploadingContext);
  return ctx?.isUploading ?? false;
}
