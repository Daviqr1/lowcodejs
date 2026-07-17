import { FieldCombobox } from '@/components/common/selectors/field-combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type TableFieldRelationshipFieldSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  tableSlug: string;
  onFieldChange?: (fieldSlug: string) => void;
};

export function TableFieldRelationshipFieldSelect({
  label,
  placeholder = 'Selecione um campo',
  disabled,
  required,
  tableSlug,
  onFieldChange,
}: TableFieldRelationshipFieldSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-field-relationship-field-select"
      data-test-id="table-field-relationship-field-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <FieldCombobox
        value={field.state.value}
        onValueChange={(value, slug) => {
          field.handleChange(value);
          if (slug) {
            onFieldChange?.(slug);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        tableSlug={tableSlug}
        className={cn(isInvalid && 'border-destructive')}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
