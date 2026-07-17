import { EyeClosedIcon, EyeIcon, LockIcon } from 'lucide-react';
import React from 'react';

import { TableRowFieldLabel } from './table-row-field-label';

import { Field, FieldError } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import type { IField } from '@/lib/interfaces';
import { resolveFieldLabel } from '@/lib/table';

type TableRowPasswordFieldProps = {
  field: IField;
  disabled?: boolean;
};

export function TableRowPasswordField({
  field,
  disabled,
}: TableRowPasswordFieldProps): React.JSX.Element {
  const formField = useFieldContext<string>();
  const [showPassword, setShowPassword] = React.useState(false);
  const isInvalid =
    formField.state.meta.isTouched && !formField.state.meta.isValid;
  const errorId = `${formField.name}-error`;

  let inputType = 'password';
  if (showPassword) {
    inputType = 'text';
  }

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  let toggleIcon = <EyeIcon />;
  if (showPassword) {
    toggleIcon = <EyeClosedIcon />;
  }

  return (
    <Field
      data-slot="table-row-password-field"
      data-test-id="table-row-password-input"
      data-invalid={isInvalid}
    >
      <TableRowFieldLabel
        field={field}
        htmlFor={formField.name}
      />
      <InputGroup data-disabled={disabled}>
        <InputGroupInput
          data-test-id="table-row-password-input"
          disabled={disabled}
          id={formField.name}
          name={formField.name}
          type={inputType}
          placeholder={`Digite ${resolveFieldLabel(field, 'form').toLowerCase()}`}
          value={formField.state.value || ''}
          onBlur={formField.handleBlur}
          onChange={(e) => formField.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          aria-required={field.required || undefined}
          aria-describedby={ariaDescribedBy}
        />
        <InputGroupAddon>
          <LockIcon className="size-4" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            disabled={disabled}
            type="button"
            aria-label="toggle password visibility"
            title="toggle password visibility"
            size="icon-xs"
            className="cursor-pointer"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {toggleIcon}
          </InputGroupButton>
        </InputGroupAddon>
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
