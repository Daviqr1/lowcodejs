import { FingerprintIcon, PhoneIcon } from 'lucide-react';
import { IMaskInput } from 'react-imask';

import { TableRowFieldLabel } from './table-row-field-label';

import { Field, FieldError } from '@/components/ui/field';
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_FIELD_FORMAT } from '@/lib/constant';
import { getMaskConfig } from '@/lib/field-masks';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type TableRowMaskedTextFieldProps = {
  field: IField;
  disabled?: boolean;
};

function getFormatIcon(format: string | null | undefined): React.JSX.Element {
  if (format === E_FIELD_FORMAT.PHONE) return <PhoneIcon className="size-4" />;
  return <FingerprintIcon className="size-4" />;
}

export function TableRowMaskedTextField({
  field,
  disabled,
}: TableRowMaskedTextFieldProps): React.JSX.Element {
  const formField = useFieldContext<string>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  const maskConfig = getMaskConfig(field.format);

  let maskProp: Record<string, unknown>;
  if (Array.isArray(maskConfig)) {
    maskProp = { mask: maskConfig };
  } else {
    maskProp = { mask: maskConfig ?? '' };
  }

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  return (
    <Field
      data-slot="table-row-masked-text-field"
      data-test-id="table-row-masked-input"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <InputGroup data-disabled={disabled}>
        <IMaskInput
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
          {...maskProp}
          data-test-id="table-row-masked-input"
          unmask={false}
          value={formField.state.value || ''}
          onAccept={(value: string) => formField.handleChange(value)}
          onBlur={formField.handleBlur}
          disabled={disabled}
          id={formField.name}
          name={formField.name}
          placeholder={`Digite ${resolveFieldLabel(field, 'form').toLowerCase()}`}
          data-slot="input-group-control"
          aria-invalid={isInvalid}
          aria-required={field.required || undefined}
          aria-describedby={ariaDescribedBy}
        />
        <InputGroupAddon>{getFormatIcon(field.format)}</InputGroupAddon>
      </InputGroup>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={formField.state.meta.errors}
        />
      )}
    </Field>
  );
}
