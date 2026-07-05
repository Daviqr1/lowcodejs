import { Suspense, lazy } from 'react';

import { TableRowFieldLabel } from './table-row-field-label';

import { Field, FieldError } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IField } from '@/lib/interfaces';
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

type TableRowRichTextFieldProps = {
  field: IField;
  disabled?: boolean;
  compact?: boolean;
};

export function TableRowRichTextField({
  field,
  disabled,
  compact = false,
}: TableRowRichTextFieldProps): React.JSX.Element {
  const formField = useFieldContext<string>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  if (disabled) {
    return (
      <Field
        data-slot="table-row-rich-text-field"
        data-test-id="table-row-rich-text"
      >
        <TableRowFieldLabel field={field} />
        <div className="border rounded-md p-4 bg-muted min-h-25">
          <Suspense fallback={<Skeleton className="h-20 w-full" />}>
            <ContentViewer content={formField.state.value || ''} />
          </Suspense>
        </div>
      </Field>
    );
  }

  let editorVariant: 'default' | 'compact' = 'default';
  if (compact) {
    editorVariant = 'compact';
  }

  return (
    <Field
      data-slot="table-row-rich-text-field"
      data-test-id="table-row-rich-text"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <div
        className={cn(
          'border rounded-md overflow-hidden',
          isInvalid && 'border-destructive',
        )}
      >
        <Suspense fallback={<EditorSkeleton />}>
          <Editor
            value={formField.state.value || ''}
            onChange={(value) => formField.handleChange(value)}
            variant={editorVariant}
            defaultMode="rich"
            showToolbar={!compact}
            showBubble={!compact}
            showModeToggle={!compact}
          />
        </Suspense>
      </div>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
