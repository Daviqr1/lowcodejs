import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Paperclip, Upload, X } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import type { FileUploadProps } from '@/components/common/file-upload/file-upload';
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from '@/components/common/file-upload/file-upload';
import { useUploadingContext } from '@/components/common/file-upload/uploading-context';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api';
import type { IStorage } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type FileUploadWithStorageProps = {
  value: Array<File>;
  onValueChange: (files: Array<File>) => void;
  onStorageChange: (storages: Array<IStorage>) => void;
  initialStorages?: Array<IStorage>;
  onUploadingChange?: (isUploading: boolean) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  placeholder?: string;
  defaultValue?: Array<File>;
  shouldDeleteFromStorage?: boolean;
  compact?: boolean;
  showHint?: boolean;
  staticName?: string;
};

function dedupeStorages(storages: Array<IStorage>): Array<IStorage> {
  const map = new Map<string, IStorage>();
  storages.forEach((storage) => {
    if (!storage?._id) return;
    if (!map.has(storage._id)) map.set(storage._id, storage);
  });
  return Array.from(map.values());
}

export function FileUploadWithStorage({
  value,
  onValueChange,
  onStorageChange,
  initialStorages = [],
  onUploadingChange,
  accept,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024,
  className,
  placeholder = 'Arraste e solte ou escolha o arquivo',
  defaultValue,
  shouldDeleteFromStorage = true,
  compact = false,
  showHint = true,
  staticName,
}: FileUploadWithStorageProps): React.JSX.Element {
  const [storageFiles, setStorageFiles] = React.useState<Map<File, IStorage>>(
    new Map(),
  );
  const [isProcessing, setIsProcessing] = React.useState(false);
  const seededInitialStoragesRef = React.useRef(false);

  const onStorageChangeRef = React.useRef(onStorageChange);
  onStorageChangeRef.current = onStorageChange;

  const upload = useMutation({
    mutationFn: async function (files: Array<File>) {
      const formData = new FormData();

      for (const file of files) {
        formData.append('files', file);
      }

      const route = '/storage';
      const response = await API.post<Array<IStorage>>(route, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...(staticName && { params: { staticName } }),
      });
      return response.data;
    },
    onError(error) {
      if (error instanceof AxiosError) {
        const data = error.response?.data;

        if (data?.code === 500 && data?.cause === 'STORAGE_UPLOAD_ERROR') {
          toast.error('Erro ao fazer upload', {
            description:
              'Houve um problema ao tentar fazer upload, tente novamente mais tarde.',
          });
        }
      }
    },
    onSuccess(response, uploadedFiles) {
      setStorageFiles((prevStorageFiles) => {
        const newStorageFiles = new Map(prevStorageFiles);

        for (const [index, file] of uploadedFiles.entries()) {
          if (response[index]) {
            newStorageFiles.set(file, response[index]);
          }
        }

        const storages = dedupeStorages(Array.from(newStorageFiles.values()));
        queueMicrotask(() => onStorageChangeRef.current(storages));

        return newStorageFiles;
      });
    },
  });

  const remove = useMutation({
    mutationFn: async function ({ storage }: { storage: IStorage }) {
      if (shouldDeleteFromStorage) {
        const route = '/storage/'.concat(storage._id);
        await API.delete(route);
      }
      return storage;
    },
    onError(error) {
      if (error instanceof AxiosError) {
        const data = error.response?.data;

        if (data?.code === 404 && data?.cause === 'STORAGE_NOT_FOUND') {
          toast.error(data?.message ?? 'Arquivo não encontrado');
        }

        if (data?.code === 500 && data?.cause === 'STORAGE_DELETE_ERROR') {
          toast.error(data?.message ?? 'Erro interno do servidor');
        }
      }
    },
    onSuccess(deletedStorage) {
      // Encontrar o arquivo associado ao storage
      let fileToRemove: File | null = null;

      for (const [file, storage] of storageFiles.entries()) {
        if (storage._id === deletedStorage._id) {
          fileToRemove = file;
          break;
        }
      }

      if (fileToRemove) {
        setStorageFiles((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fileToRemove);

          const remaining = dedupeStorages(Array.from(newMap.values()));
          queueMicrotask(() => onStorageChangeRef.current(remaining));

          return newMap;
        });

        const updatedFiles = value.filter((f) => f !== fileToRemove);
        onValueChange(updatedFiles);
      } else {
        // Atualizar lista de storages retornando objetos completos
        const remainingStorages = Array.from(storageFiles.values()).filter(
          (storage) => storage._id !== deletedStorage._id,
        );
        onStorageChange(dedupeStorages(remainingStorages));
      }
    },
  });

  const isPending =
    isProcessing || upload.status === 'pending' || remove.status === 'pending';

  const uploadingCtx = useUploadingContext();
  const uploadId = React.useId();

  React.useEffect(() => {
    if (!uploadingCtx) return;

    if (isPending) {
      uploadingCtx.registerUpload(uploadId);
    } else {
      uploadingCtx.unregisterUpload(uploadId);
    }

    return (): void => {
      uploadingCtx.unregisterUpload(uploadId);
    };
  }, [isPending, uploadingCtx, uploadId]);

  React.useEffect(() => {
    onUploadingChange?.(isPending);
  }, [isPending, onUploadingChange]);

  React.useEffect(() => {
    if (seededInitialStoragesRef.current) return;
    if (initialStorages.length === 0 || value.length === 0) return;

    setStorageFiles((prevStorageFiles) => {
      const nextStorageFiles = new Map(prevStorageFiles);
      const uploadedFiles = value.filter(
        (file) => 'isUploaded' in file && Boolean(file.isUploaded),
      );

      initialStorages.forEach((storage, index) => {
        const file = uploadedFiles[index];
        if (!file) return;
        if (nextStorageFiles.has(file)) return;
        nextStorageFiles.set(file, storage);
      });

      return nextStorageFiles;
    });
    seededInitialStoragesRef.current = true;
  }, [initialStorages, value]);

  const onUpload: NonNullable<FileUploadProps['onUpload']> = React.useCallback(
    async (files, { onProgress, onSuccess, onError }) => {
      setIsProcessing(true);
      try {
        // Simulate progress up to 80% while waiting for actual upload
        const progressIntervals = files.map((file) => {
          let progress = 0;
          const interval = setInterval(
            () => {
              progress = Math.min(progress + Math.random() * 15 + 5, 80);
              onProgress(file, progress);
            },
            Math.random() * 200 + 100,
          );
          return interval;
        });

        try {
          await upload.mutateAsync(files);

          // Upload succeeded: complete progress and mark success
          for (const interval of progressIntervals) {
            clearInterval(interval);
          }
          for (const file of files) {
            onProgress(file, 100);
            onSuccess(file);
          }
        } catch (error) {
          for (const interval of progressIntervals) {
            clearInterval(interval);
          }
          for (const file of files) {
            let uploadError = new Error('Upload failed');
            if (error instanceof Error) {
              uploadError = error;
            }
            onError(file, uploadError);
          }
        }
      } catch {
        // Errors already handled by upload mutation onError
      } finally {
        setIsProcessing(false);
      }
    },
    [upload],
  );

  const onFileReject = React.useCallback((file: File, message: string) => {
    let errorMessage = message;

    if (message === 'File too large') {
      errorMessage = 'Arquivo muito grande';
    } else if (message === 'File type not accepted') {
      errorMessage = 'Tipo de arquivo não aceito';
    } else if (message.startsWith('Maximum')) {
      errorMessage = 'Número máximo de arquivos excedido';
    }

    toast.error(errorMessage, {
      description: ((): string => {
        let displayName = file.name;
        if (file.name.length > 20) {
          displayName = `${file.name.slice(0, 20)}...`;
        }
        return `"${displayName}" foi rejeitado`;
      })(),
    });
  }, []);

  const onFileValidate = React.useCallback(
    (file: File) => {
      const isDuplicate = value.some(
        (existingFile) => existingFile.name === file.name,
      );
      if (isDuplicate) {
        return 'Arquivo com esse nome já foi adicionado';
      }
      return null;
    },
    [value],
  );

  const findStorageForFile = React.useCallback(
    (file: File): IStorage | undefined => {
      const direct = storageFiles.get(file);
      if (direct) return direct;

      for (const [mapFile, storage] of storageFiles.entries()) {
        if (mapFile.name === file.name && mapFile.size === file.size) {
          return storage;
        }
      }

      return undefined;
    },
    [storageFiles],
  );

  const handleRemoveFile = React.useCallback(
    (file: File) => {
      const storage = findStorageForFile(file);

      if (storage) {
        remove.mutateAsync({ storage });
      }

      if (!storage) {
        const updatedFiles = value.filter((f) => f !== file);
        onValueChange(updatedFiles);
      }
    },
    [findStorageForFile, value, onValueChange, remove],
  );

  let triggerButtonSize: 'icon-sm' | 'sm' = 'sm';
  if (compact) {
    triggerButtonSize = 'icon-sm';
  }

  return (
    <FileUpload
      data-slot="file-upload-with-storage"
      data-test-id="file-upload-with-storage"
      value={value}
      onValueChange={onValueChange}
      onUpload={onUpload}
      onFileReject={onFileReject}
      onFileValidate={onFileValidate}
      accept={accept}
      maxFiles={maxFiles}
      maxSize={maxSize}
      className={className}
      multiple={maxFiles > 1}
      defaultValue={defaultValue}
    >
      <FileUploadDropzone
        className={cn(
          'flex-row flex-wrap border-dotted text-center',
          compact && 'gap-1 py-2 text-xs',
          !compact && 'gap-2',
        )}
      >
        <Upload className={cn(compact && 'size-3', !compact && 'size-4')} />
        {!compact && placeholder}
        <FileUploadTrigger
          asChild
          disabled={isPending}
        >
          <Button
            variant="link"
            size={triggerButtonSize}
            className={cn('p-0 cursor-pointer', compact && 'h-6 w-6')}
            aria-label="Anexar arquivo"
          >
            {compact && <Paperclip className="size-3.5" />}
            {!compact && 'escolha o arquivo'}
          </Button>
        </FileUploadTrigger>
        {showHint && !compact && (
          <span className="w-full text-xs text-muted-foreground">
            Tamanho máximo: {Math.round(maxSize / (1024 * 1024))}MB
          </span>
        )}
      </FileUploadDropzone>
      <FileUploadList>
        {value.map((file, index) => {
          const storage = findStorageForFile(file);
          const displayName = file.name;
          const displaySize = Math.round(file.size / 1024);

          return (
            <FileUploadItem
              key={index}
              value={file}
              className="flex-col"
            >
              <div className="flex w-full items-center gap-2">
                <FileUploadItemPreview />
                {storage && (
                  <div className="flex min-w-0 flex-1 flex-col">
                    <a
                      href={storage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Abrir ${displayName} em nova aba (botão direito para salvar)`}
                      className="truncate font-medium text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      {displayName}
                    </a>
                    <span className="truncate text-muted-foreground text-xs">
                      {displaySize} KB
                    </span>
                  </div>
                )}
                {!storage && <FileUploadItemMetadata />}
                <FileUploadItemDelete asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleRemoveFile(file)}
                  >
                    <X />
                  </Button>
                </FileUploadItemDelete>
              </div>
              {!('isUploaded' in file) && <FileUploadItemProgress />}
            </FileUploadItem>
          );
        })}
      </FileUploadList>
    </FileUpload>
  );
}
