import { TableRowFieldLabel } from './table-row-field-label';

import { SingleDatepicker } from '@/components/common/datepicker';
import { Field, FieldError } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_FIELD_FORMAT } from '@/lib/constant';
import type { IField } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type TableRowDateFieldProps = {
  field: IField;
  disabled?: boolean;
};

export function TableRowDateField({
  field,
  disabled,
}: TableRowDateFieldProps): React.JSX.Element {
  const formField = useFieldContext<string>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  const formatString = field.format ?? E_FIELD_FORMAT.DD_MM_YYYY;
  let dateValue = null;
  if (formField.state.value) {
    dateValue = {
      startDate: new Date(formField.state.value),
      endDate: new Date(formField.state.value),
    };
  }

  return (
    <Field
      data-slot="table-row-date-field"
      data-test-id="table-row-date-input"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <SingleDatepicker
        data-test-id="table-row-date-input"
        value={dateValue}
        onChange={(value) =>
          formField.handleChange(value?.startDate?.toISOString() ?? '')
        }
        displayFormat={formatString}
        placeholder={(field.format ?? E_FIELD_FORMAT.DD_MM_YYYY).toUpperCase()}
        disabled={disabled}
        className={cn(
          disabled && 'pointer-events-none opacity-50',
          isInvalid && 'border-destructive',
        )}
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
