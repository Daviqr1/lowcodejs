import { EyeClosedIcon, EyeIcon } from 'lucide-react';
import React from 'react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';

type FieldPasswordProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function FieldPassword({
  label,
  placeholder,
  disabled,
  required,
}: FieldPasswordProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const [showPassword, setShowPassword] = React.useState(false);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

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
      data-slot="field-password"
      data-test-id="field-password-input"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          data-test-id="field-password-input"
          disabled={disabled}
          id={field.name}
          name={field.name}
          type={inputType}
          placeholder={placeholder}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          aria-required={required || undefined}
          aria-describedby={ariaDescribedBy}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            data-test-id="field-password-toggle-btn"
            disabled={disabled}
            type="button"
            aria-label="toggle password visibility"
            title="toggle password visibility"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {toggleIcon}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={field.state.meta.errors}
        />
      )}
    </Field>
  );
}
