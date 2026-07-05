import { TableRowFieldLabel } from './table-row-field-label';

import { Field, FieldError } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type TableRowTextareaFieldProps = {
  field: IField;
  disabled?: boolean;
  compact?: boolean;
};

export function TableRowTextareaField({
  field,
  disabled,
  compact = false,
}: TableRowTextareaFieldProps): React.JSX.Element {
  const formField = useFieldContext<string>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  let textareaRows = 3;
  if (compact) {
    textareaRows = 2;
  }

  let textareaClassName: string | undefined = undefined;
  if (compact) {
    textareaClassName = 'max-h-24 min-h-20';
  }

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  return (
    <Field
      data-slot="table-row-textarea-field"
      data-test-id="table-row-textarea"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <Textarea
        data-test-id="table-row-textarea"
        disabled={disabled}
        id={formField.name}
        name={formField.name}
        placeholder={`Digite ${resolveFieldLabel(field, 'form').toLowerCase()}`}
        value={formField.state.value || ''}
        onBlur={formField.handleBlur}
        onChange={(e) => formField.handleChange(e.target.value)}
        rows={textareaRows}
        className={textareaClassName}
        aria-invalid={isInvalid}
        aria-required={field.required || undefined}
        aria-describedby={ariaDescribedBy}
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
