import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFieldContext } from '@/integrations/tanstack-form/form-context';
import {
  DATE_FORMAT_OPTIONS,
  E_FIELD_TYPE,
  TEXT_FORMAT_OPTIONS,
  TEXT_LONG_FORMAT_OPTIONS,
} from '@/lib/constant';
import { cn } from '@/lib/utils';

type TableFieldFormatSelectProps = {
  label: string;
  placeholder?: string;
  disabled?: boolean;
  fieldType: keyof typeof FORMAT_OPTIONS_MAP;
  required?: boolean;
};

const FORMAT_OPTIONS_MAP = {
  [E_FIELD_TYPE.TEXT_SHORT]: TEXT_FORMAT_OPTIONS,
  [E_FIELD_TYPE.TEXT_LONG]: TEXT_LONG_FORMAT_OPTIONS,
  [E_FIELD_TYPE.DATE]: DATE_FORMAT_OPTIONS,
} as const;

export function TableFieldFormatSelect({
  label,
  placeholder = 'Selecione um formato',
  disabled,
  fieldType,
  required,
}: TableFieldFormatSelectProps): React.JSX.Element {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const formatList = FORMAT_OPTIONS_MAP[fieldType];

  return (
    <Field
      data-slot="table-field-format-select"
      data-test-id="table-field-format-select"
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
          {formatList.map((item) => (
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
