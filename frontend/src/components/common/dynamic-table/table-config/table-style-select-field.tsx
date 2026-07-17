import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import { E_TABLE_STYLE, TABLE_STYLE_OPTIONS } from '@/lib/constant';
import type { ValueOf } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type TableStyleSelectFieldProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  allowedStyles?: Array<ValueOf<typeof E_TABLE_STYLE>>;
};

export function TableStyleSelectField({
  label,
  placeholder = 'Selecione o estilo de visualização',
  disabled,
  required,
  allowedStyles,
}: TableStyleSelectFieldProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const allowedValues =
    allowedStyles ??
    TABLE_STYLE_OPTIONS.filter(
      (option) =>
        option.value !== E_TABLE_STYLE.MOSAIC &&
        option.value !== E_TABLE_STYLE.CARD &&
        option.value !== E_TABLE_STYLE.KANBAN &&
        option.value !== E_TABLE_STYLE.FORUM &&
        option.value !== E_TABLE_STYLE.CALENDAR,
    ).map((option) => option.value);

  return (
    <Field
      data-slot="table-style-select-field"
      data-test-id="table-style-select-field"
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
        }}
      >
        <SelectTrigger className={cn(isInvalid && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {TABLE_STYLE_OPTIONS.map((option) => {
            if (!allowedValues.includes(option.value)) return null;
            return (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
