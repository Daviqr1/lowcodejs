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

type OrderOption = {
  label: string;
  value: string;
};

type TableOrderSelectFieldProps = {
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  options: Array<OrderOption>;
};

export function TableOrderSelectField({
  label,
  description,
  placeholder = 'Selecione uma ordenação',
  disabled,
  required,
  options,
}: TableOrderSelectFieldProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-slot="table-order-select-field"
      data-test-id="table-order-select-field"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <Select
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <SelectTrigger className={cn(isInvalid && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
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
