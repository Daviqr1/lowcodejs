import { HashIcon, LinkIcon, MailIcon, TextIcon } from 'lucide-react';
import React from 'react';

import { TableRowFieldLabel } from './table-row-field-label';
import { TableRowMaskedTextField } from './table-row-masked-text-field';
import { TableRowPasswordField } from './table-row-password-field';

import { Field, FieldError } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_FIELD_FORMAT } from '@/lib/constant';
import {
  getInputModeForFormat,
  getInputTypeForFormat,
  isFormatMasked,
  isPasswordFormat,
} from '@/lib/field-masks';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type TableRowTextFieldProps = {
  field: IField;
  disabled?: boolean;
};

function getFormatIcon(format: string | null | undefined): React.JSX.Element {
  switch (format) {
    case E_FIELD_FORMAT.EMAIL:
      return <MailIcon className="size-4" />;
    case E_FIELD_FORMAT.URL:
      return <LinkIcon className="size-4" />;
    case E_FIELD_FORMAT.INTEGER:
    case E_FIELD_FORMAT.DECIMAL:
      return <HashIcon className="size-4" />;
    default:
      return <TextIcon className="size-4" />;
  }
}

function TableRowTextFieldDefault({
  field,
  disabled,
}: TableRowTextFieldProps): React.JSX.Element {
  const formField = useFieldContext<string>();
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  const inputType = getInputTypeForFormat(field.format);
  const inputMode = getInputModeForFormat(field.format);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (field.format === E_FIELD_FORMAT.INTEGER) {
      const allowed = [
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        '-',
      ];
      if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    }
    if (field.format === E_FIELD_FORMAT.DECIMAL) {
      const allowed = [
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        '-',
        '.',
        ',',
      ];
      if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    }
  };

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  return (
    <Field
      data-slot="table-row-text-field"
      data-test-id="table-row-text-input"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <InputGroup data-disabled={disabled}>
        <InputGroupInput
          data-test-id="table-row-text-input"
          disabled={disabled}
          id={formField.name}
          name={formField.name}
          type={inputType}
          inputMode={inputMode}
          placeholder={`Digite ${resolveFieldLabel(field, 'form').toLowerCase()}`}
          value={formField.state.value || ''}
          onBlur={formField.handleBlur}
          onChange={(e) => formField.handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
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

export function TableRowTextField({
  field,
  disabled,
}: TableRowTextFieldProps): React.JSX.Element {
  if (isPasswordFormat(field.format)) {
    return (
      <TableRowPasswordField
        field={field}
        disabled={disabled}
      />
    );
  }

  if (isFormatMasked(field.format)) {
    return (
      <TableRowMaskedTextField
        field={field}
        disabled={disabled}
      />
    );
  }

  return (
    <TableRowTextFieldDefault
      field={field}
      disabled={disabled}
    />
  );
}
