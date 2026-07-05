import { Suspense, lazy } from 'react';

import type { EditorMode } from '@/components/common/rich-editor';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

const Editor = lazy(() =>
  import('@/components/common/rich-editor').then((m) => ({
    default: m.Editor,
  })),
);

const ContentViewer = lazy(() =>
  import('@/components/common/rich-editor').then((m) => ({
    default: m.ContentViewer,
  })),
);

function EditorSkeleton(): React.JSX.Element {
  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-6 w-6"
          />
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

type FieldEditorProps = {
  label: string;
  showPreview?: boolean;
  defaultMode?: EditorMode;
};

export function FieldEditor({
  label,
  showPreview,
  defaultMode,
}: FieldEditorProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  return (
    <Field
      data-slot="field-editor"
      data-test-id="field-editor"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {!showPreview && (
        <div
          className={cn(
            'border rounded-md overflow-hidden',
            isInvalid && 'border-destructive',
          )}
        >
          <Suspense fallback={<EditorSkeleton />}>
            <Editor
              value={field.state.value || ''}
              onChange={(value) => field.handleChange(value)}
              showToolbar={true}
              showCharCount={true}
              defaultMode={defaultMode}
            />
          </Suspense>
        </div>
      )}
      {showPreview && (
        <div className="border rounded-md p-4 bg-muted min-h-25">
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <ContentViewer content={field.state.value || ''} />
          </Suspense>
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
