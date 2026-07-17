import { GroupCombobox } from '@/components/common/selectors/group-combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type FieldGroupComboboxProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function FieldGroupCombobox({
  label,
  placeholder,
  disabled,
  required,
}: FieldGroupComboboxProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  return (
    <Field
      data-slot="field-group-combobox"
      data-test-id="field-group-combobox"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <GroupCombobox
        data-test-id="field-group-combobox"
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        placeholder={placeholder}
        className={cn(isInvalid && 'border-destructive')}
        aria-label={label}
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
