import { ImageIcon, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { uploadFile } from './upload';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ImageUploadProps {
  children: React.ReactNode;
  onUpload: (url: string) => void;
}

export function ImageUpload({
  children,
  onUpload,
}: ImageUploadProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<File | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      fileRef.current = file;
      const reader = new FileReader();
      reader.onload = (): void => {
        if (typeof reader.result === 'string') setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleInsert = useCallback(async () => {
    const file = fileRef.current;
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onUpload(url);
      setOpen(false);
      setPreview(null);
      fileRef.current = null;
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  return (
    <Dialog
      data-slot="editor-image-upload"
      data-test-id="rich-editor-image-upload"
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setPreview(null);
          fileRef.current = null;
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inserir imagem</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 rounded border object-contain"
            />
          )}
          {!preview && (
            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border hover:bg-accent/50 transition-colors">
              <ImageIcon className="size-8 text-muted-foreground" />
              <span className="mt-2 text-sm text-muted-foreground">
                Clique para selecionar
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
          {preview && (
            <div className="flex gap-2 w-full">
              <label className="flex-1 cursor-pointer text-center rounded border border-border py-1.5 text-sm hover:bg-accent transition-colors">
                Trocar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <button
                type="button"
                disabled={uploading}
                onClick={handleInsert}
                className="flex-1 rounded bg-primary text-primary-foreground py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {uploading && <Loader2 className="size-4 animate-spin" />}
                Inserir
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
