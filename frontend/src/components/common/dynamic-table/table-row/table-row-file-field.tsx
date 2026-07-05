import * as React from 'react';

import { TableRowFieldLabel } from './table-row-field-label';

import { FileUploadWithStorage } from '@/components/common/file-upload/file-upload-with-storage';
import { Field, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useSettingRead } from '@/hooks/tanstack-query/use-setting-read';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IField, IStorage } from '@/lib/interfaces';
import { cn, fileExtensionsToAccept } from '@/lib/utils';

type TableRowFileFieldProps = {
  field: IField;
  disabled?: boolean;
};

type FileValue = {
  files: Array<File>;
  storages: Array<IStorage>;
};

type FileWithUploaded = File & { isUploaded?: boolean };

async function storageToFile(storage: IStorage): Promise<FileWithUploaded> {
  const response = await fetch(storage.url);
  const blob = await response.blob();
  const file: FileWithUploaded = new File([blob], storage.originalName, {
    type: storage.mimetype,
  });
  file.isUploaded = true;
  return file;
}

export function TableRowFileField({
  field,
  disabled,
}: TableRowFileFieldProps): React.JSX.Element {
  const formField = useFieldContext<FileValue>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;
  const rawValue = formField.state.value;
  let value: FileValue = { files: [], storages: [] };
  if (
    rawValue &&
    typeof rawValue === 'object' &&
    'files' in rawValue &&
    'storages' in rawValue
  ) {
    value = rawValue;
  }

  const { data: settings } = useSettingRead();

  const resolvedMaxSize = settings?.FILE_UPLOAD_MAX_SIZE ?? 5 * 1024 * 1024;

  let resolvedAccept: string | undefined;
  if (
    settings?.FILE_UPLOAD_ACCEPTED &&
    settings.FILE_UPLOAD_ACCEPTED.length > 0
  ) {
    resolvedAccept = fileExtensionsToAccept(settings.FILE_UPLOAD_ACCEPTED);
  }

  const [isLoadingFiles, setIsLoadingFiles] = React.useState(false);
  const [initialStorages] = React.useState<Array<IStorage>>(
    () => value.storages,
  );

  React.useEffect(() => {
    async function loadStorageFiles(): Promise<void> {
      if (initialStorages.length === 0) return;
      if (value.files.length > 0) return;

      setIsLoadingFiles(true);

      try {
        const files = await Promise.all(initialStorages.map(storageToFile));

        formField.handleChange({
          files,
          storages: initialStorages,
        });
      } catch (error) {
        console.error('Erro ao carregar arquivos:', error);
      } finally {
        setIsLoadingFiles(false);
      }
    }

    loadStorageFiles();
  }, []);

  if (isLoadingFiles) {
    return (
      <Field data-slot="table-row-file-field">
        <TableRowFieldLabel
          field={field}
          htmlFor={formField.name}
        />
        <div className="flex items-center gap-2 p-4 border rounded-md">
          <Spinner />
          <span className="text-sm text-muted-foreground">
            Carregando arquivos...
          </span>
        </div>
      </Field>
    );
  }

  let maxFiles = 1;
  if (field.multiple) {
    maxFiles = settings?.FILE_UPLOAD_MAX_FILES_PER_UPLOAD ?? 10;
  }

  return (
    <Field
      data-slot="table-row-file-field"
      data-test-id="table-row-file-upload"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <FileUploadWithStorage
        data-test-id="table-row-file-upload"
        value={value.files}
        onValueChange={(files) =>
          formField.handleChange((prev: FileValue) => ({ ...prev, files }))
        }
        onStorageChange={(storages) =>
          formField.handleChange((prev: FileValue) => ({ ...prev, storages }))
        }
        initialStorages={initialStorages}
        maxFiles={maxFiles}
        maxSize={resolvedMaxSize}
        accept={resolvedAccept}
        className={cn(disabled && 'pointer-events-none opacity-50')}
      />
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
