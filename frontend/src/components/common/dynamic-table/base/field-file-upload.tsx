import { FileUploadWithStorage } from '@/components/common/file-upload/file-upload-with-storage';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useSettingRead } from '@/hooks/tanstack-query/use-setting-read';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IStorage } from '@/lib/interfaces';
import { fileExtensionsToAccept } from '@/lib/utils';

type FieldFileUploadProps = {
  label: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  placeholder?: string;
  shouldDeleteFromStorage?: boolean;
  onStorageChange?: (storages: Array<IStorage>) => void;
  showPreview?: boolean;
  previewUrl?: string;
  previewAlt?: string;
};

export function FieldFileUpload({
  label,
  accept,
  maxFiles,
  maxSize,
  placeholder,
  shouldDeleteFromStorage,
  onStorageChange,
  showPreview,
  previewUrl,
  previewAlt,
}: FieldFileUploadProps): React.JSX.Element {
  const field = useFieldContext<Array<File>>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  const { data: settings } = useSettingRead();

  const resolvedMaxSize =
    maxSize ?? settings?.FILE_UPLOAD_MAX_SIZE ?? 4 * 1024 * 1024;
  const resolvedMaxFiles =
    maxFiles ?? settings?.FILE_UPLOAD_MAX_FILES_PER_UPLOAD ?? 1;
  let acceptFromSettings: string | undefined;
  if (
    settings?.FILE_UPLOAD_ACCEPTED &&
    settings.FILE_UPLOAD_ACCEPTED.length > 0
  ) {
    acceptFromSettings = fileExtensionsToAccept(settings.FILE_UPLOAD_ACCEPTED);
  }
  const resolvedAccept: string | undefined = accept ?? acceptFromSettings;

  return (
    <Field
      data-slot="field-file-upload"
      data-test-id="field-file-upload"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

      {!showPreview && (
        <FileUploadWithStorage
          data-test-id="field-file-upload"
          value={field.state.value}
          onValueChange={field.handleChange}
          onStorageChange={onStorageChange || ((): void => {})}
          accept={resolvedAccept}
          maxFiles={resolvedMaxFiles}
          maxSize={resolvedMaxSize}
          placeholder={placeholder}
          shouldDeleteFromStorage={shouldDeleteFromStorage}
        />
      )}

      {showPreview && previewUrl && (
        <div className="mt-2 p-2 border rounded-md">
          <img
            src={previewUrl}
            alt={previewAlt || 'Preview'}
            className="w-full h-32 object-contain"
          />
        </div>
      )}

      {isInvalid && (
        <FieldError
          id={errorId}
          errors={field.state.meta.errors}
        />
      )}
    </Field>
  );
}
