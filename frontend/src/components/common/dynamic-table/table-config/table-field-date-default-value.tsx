import * as React from 'react';

import { SingleDatepicker } from '@/components/common/datepicker';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type TableFieldDateDefaultValueProps = {
  label?: string;
  disabled?: boolean;
};

export function TableFieldDateDefaultValue({
  label = 'Valor padrão',
  disabled,
}: TableFieldDateDefaultValueProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const value = field.state.value ?? '';

  let dateValue = null;
  if (value) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      dateValue = { startDate: parsed, endDate: parsed };
    }
  }

  const handleChange = (
    val: { startDate: Date | null; endDate: Date | null } | null,
  ): void => {
    if (val && val.startDate) {
      field.handleChange(val.startDate.toISOString());
    } else {
      field.handleChange('');
    }
    field.handleBlur();
  };

  return (
    <Field
      data-slot="table-field-date-default-value"
      data-test-id="table-field-date-default-value"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <SingleDatepicker
        data-test-id="table-field-date-default-value-picker"
        value={dateValue}
        onChange={handleChange}
        displayFormat="dd/MM/yyyy"
        placeholder="Sem valor padrão"
        disabled={disabled}
        className={cn(
          disabled && 'pointer-events-none opacity-50',
          isInvalid && 'border-destructive',
        )}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
