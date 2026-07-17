import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';

type FieldTextareaProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  required?: boolean;
};

export function FieldTextarea({
  label,
  placeholder,
  disabled,
  rows = 3,
  required,
}: FieldTextareaProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  let ariaDescribedBy: string | undefined = undefined;
  if (isInvalid) {
    ariaDescribedBy = errorId;
  }

  return (
    <Field
      data-slot="field-textarea"
      data-test-id="field-textarea"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        data-test-id="field-textarea"
        disabled={disabled}
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        aria-required={required || undefined}
        aria-describedby={ariaDescribedBy}
        rows={rows}
      />
      {isInvalid && (
        <FieldError
          id={errorId}
          errors={field.state.meta.errors}
        />
      )}
    </Field>
  );
}
