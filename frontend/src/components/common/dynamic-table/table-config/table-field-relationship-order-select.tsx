import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { cn } from '@/lib/utils';

const ORDER_LIST = [
  { label: 'Ascendente', value: 'asc' },
  { label: 'Descendente', value: 'desc' },
];

type TableFieldRelationshipOrderSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export function TableFieldRelationshipOrderSelect({
  label,
  placeholder = 'Selecione uma ordem',
  disabled,
  required,
}: TableFieldRelationshipOrderSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-field-relationship-order-select"
      data-test-id="table-field-relationship-order-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Select
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger className={cn(isInvalid && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {ORDER_LIST.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
