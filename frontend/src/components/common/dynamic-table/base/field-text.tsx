import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';

type FieldTextProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  required?: boolean;
  description?: string;
  onChangeTransform?: (value: string) => string;
};

export function FieldText({
  label,
  placeholder,
  disabled,
  icon,
  required,
  description,
  onChangeTransform,
}: FieldTextProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  return (
    <Field
      data-slot="field-text"
      data-test-id="field-text-input"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          data-test-id="field-text-input"
          disabled={disabled}
          id={field.name}
          name={field.name}
          type="text"
          placeholder={placeholder}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => {
            const raw = e.target.value;
            if (onChangeTransform) {
              field.handleChange(onChangeTransform(raw));
              return;
            }
            field.handleChange(raw);
          }}
          aria-invalid={isInvalid}
          aria-required={required || undefined}
          aria-describedby={ariaDescribedBy}
        />
        {icon && <InputGroupAddon>{icon}</InputGroupAddon>}
      </InputGroup>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
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
