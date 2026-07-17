import { TableMultiSelect } from '@/components/common/dynamic-table/table-selectors/table-multi-select';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type FieldTableMultiSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowedTableIds?: Array<string>;
};

export function FieldTableMultiSelect({
  label,
  placeholder,
  disabled,
  required,
  allowedTableIds,
}: FieldTableMultiSelectProps): React.JSX.Element {
  const field = useFieldContext<Array<string>>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorId = `${field.name}-error`;

  return (
    <Field
      data-slot="field-table-multi-select"
      data-test-id="field-table-multi-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label} {required && <span className="text-destructive">*</span>}
      </FieldLabel>
      <TableMultiSelect
        data-test-id="field-table-multi-select"
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
        }}
        placeholder={placeholder}
        className={cn(isInvalid && 'border-destructive')}
        allowedTableIds={allowedTableIds}
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
