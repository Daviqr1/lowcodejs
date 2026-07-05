import { HashIcon } from 'lucide-react';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';

type FieldNumberProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  required?: boolean;
};

export function FieldNumber({
  label,
  placeholder,
  disabled,
  min,
  required,
}: FieldNumberProps): React.JSX.Element {
  const field = useFieldContext<number>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  return (
    <Field
      data-slot="field-number"
      data-test-id="field-number-input"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          data-test-id="field-number-input"
          disabled={disabled}
          id={field.name}
          name={field.name}
          type="number"
          min={min}
          placeholder={placeholder}
          value={(Number.isFinite(field.state.value) && field.state.value) || 0}
          onBlur={field.handleBlur}
          onChange={(e) => {
            const value = e.target.valueAsNumber;
            let next = value;
            if (Number.isNaN(value)) next = 0;
            field.handleChange(next);
          }}
          aria-invalid={isInvalid}
          aria-required={required || undefined}
          aria-describedby={ariaDescribedBy}
        />
        <InputGroupAddon>
          <HashIcon />
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
