import { TableCombobox } from '@/components/common/dynamic-table/table-selectors/table-combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

type TableFieldRelationshipTableSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  excludeTableSlug?: string;
  onTableChange?: (tableSlug: string) => void;
};

export function TableFieldRelationshipTableSelect({
  label,
  placeholder = 'Selecione uma tabela',
  disabled,
  required,
  excludeTableSlug,
  onTableChange,
}: TableFieldRelationshipTableSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-field-relationship-table-select"
      data-test-id="table-field-relationship-table-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <TableCombobox
        value={field.state.value}
        onValueChange={(value, slug) => {
          field.handleChange(value);
          if (slug) {
            onTableChange?.(slug);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        excludeSlug={excludeTableSlug}
        className={cn(isInvalid && 'border-destructive')}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
