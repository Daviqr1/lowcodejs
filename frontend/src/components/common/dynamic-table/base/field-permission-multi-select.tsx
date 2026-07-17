import { PermissionMultiSelect } from '@/components/common/selectors/permission-multi-select';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type FieldPermissionMultiSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function FieldPermissionMultiSelect({
  label,
  placeholder,
  disabled,
  required,
}: FieldPermissionMultiSelectProps): React.JSX.Element {
  const field = useFieldContext<Array<string>>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  return (
    <Field
      data-slot="field-permission-multi-select"
      data-test-id="field-permission-multi-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <PermissionMultiSelect
        data-test-id="field-permission-multi-select"
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
