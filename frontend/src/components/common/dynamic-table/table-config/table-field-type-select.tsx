import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { FIELD_TYPE_OPTIONS } from '@/lib/constant';
import { cn } from '@/lib/utils';

type TableFieldTypeSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  blockedTypes?: Array<string>;
  required?: boolean;
  onTypeChange?: (type: string) => void;
};

export function TableFieldTypeSelect({
  label,
  placeholder = 'Selecione o tipo do campo',
  disabled,
  blockedTypes = [],
  required,
  onTypeChange,
}: TableFieldTypeSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const typeOptions = FIELD_TYPE_OPTIONS.filter(
    (item) => !blockedTypes.includes(item.value),
  );

  return (
    <Field
      data-slot="table-field-type-select"
      data-test-id="table-field-type-select"
      data-invalid={isInvalid}
    >
      <FieldLabel htmlFor={field.name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Select
        disabled={disabled}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
          field.handleBlur();
          onTypeChange?.(value);
        }}
      >
        <SelectTrigger className={cn(isInvalid && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((item) => (
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
